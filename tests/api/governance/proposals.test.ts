/**
 * Integration tests for governance service (proposals + voting).
 * Uses PGlite in-memory database with seed data.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { getTestDb, closeTestDb, TEST_IDS } from "@/tests/unit/database/helpers";
import type { PGlite } from "@electric-sql/pglite";

// Mock the db module to use PGlite
vi.mock("@/lib/db", async () => {
  const helpers = await import("@/tests/unit/database/helpers");
  let db: PGlite;
  return {
    query: async (text: string, params?: unknown[]) => {
      if (!db) db = await helpers.getTestDb();
      return db.query(text, params);
    },
    queryOne: async (text: string, params?: unknown[]) => {
      if (!db) db = await helpers.getTestDb();
      const result = await db.query(text, params);
      return result.rows[0] ?? null;
    },
    queryAll: async (text: string, params?: unknown[]) => {
      if (!db) db = await helpers.getTestDb();
      const result = await db.query(text, params);
      return result.rows;
    },
  };
});

import {
  createProposal,
  getProposalById,
  listProposals,
  voteOnProposal,
  checkAndExecuteProposal,
  GovernanceError,
} from "@/lib/services/governance.service";
import {
  createProposalSchema,
  listProposalsSchema,
  voteProposalSchema,
} from "@/lib/validation/proposals";

let db: PGlite;

describe("governance service", () => {
  beforeAll(async () => {
    db = await getTestDb();
    // Backdate seed memberships so users pass the 7-day requirement
    await db.exec(
      `UPDATE community_memberships SET joined_at = NOW() - INTERVAL '30 days'`
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up in FK order: ai_prompt_history refs proposals
    await db.exec(`DELETE FROM proposal_votes`);
    await db.exec(
      `DELETE FROM ai_prompt_history WHERE proposal_id IS NOT NULL`
    );
    await db.exec(`DELETE FROM proposals`);
    // Reset community prompts
    await db.exec(
      `UPDATE communities SET ai_prompt_version = 1
       WHERE id IN (
         '30000000-0000-0000-0000-000000000001',
         '30000000-0000-0000-0000-000000000002'
       )`
    );
  });

  // ─── Create Proposal ──────────────────────────────────────

  describe("createProposal", () => {
    it("should create a modify_prompt proposal", async () => {
      const result = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Update AI agent rules",
          description: "I propose we update the AI agent rules to be more lenient on memes.",
          proposed_changes: { new_prompt: "Be lenient on memes in technology discussions." },
        },
        TEST_IDS.testUser2 // member of test_tech
      );

      expect(result).toBeDefined();
      expect(result.title).toBe("Update AI agent rules");
      expect(result.proposal_type).toBe("modify_prompt");
      expect(result.status).toBe("discussion");
      expect(result.votes_for).toBe(0);
      expect(result.votes_against).toBe(0);
      expect(result.discussion_ends_at).toBeTruthy();
      expect(result.voting_ends_at).toBeTruthy();
    });

    it("should create an addendum_prompt proposal", async () => {
      const result = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "addendum_prompt",
          title: "Add meme policy",
          description: "Append meme handling rules to the AI agent prompt.",
          proposed_changes: { addendum: "Also allow technology-related memes on weekends." },
        },
        TEST_IDS.testUser2
      );

      expect(result.proposal_type).toBe("addendum_prompt");
    });

    it("should create a change_settings proposal", async () => {
      const result = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "change_settings",
          title: "Lower quorum to 20%",
          description: "Reduce the quorum requirement to 20% of members.",
          proposed_changes: { settings: { quorum_percentage: 20 } },
        },
        TEST_IDS.testUser2
      );

      expect(result.proposal_type).toBe("change_settings");
    });

    it("should set discussion and voting end times based on governance config", async () => {
      const result = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Timing test",
          description: "Testing timing calculation.",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      const discussionEnd = new Date(result.discussion_ends_at);
      const votingEnd = new Date(result.voting_ends_at);
      const now = new Date();

      // Discussion should end ~48 hours from now
      const discussionHours = (discussionEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(discussionHours).toBeGreaterThan(47);
      expect(discussionHours).toBeLessThan(49);

      // Voting should end ~168 hours (7 days) after discussion ends
      const votingHours = (votingEnd.getTime() - discussionEnd.getTime()) / (1000 * 60 * 60);
      expect(votingHours).toBeGreaterThan(167);
      expect(votingHours).toBeLessThan(169);
    });

    it("should reject proposals from non-members", async () => {
      await expect(
        createProposal(
          {
            community_id: TEST_IDS.communityDemoScience,
            proposal_type: "modify_prompt",
            title: "External proposal",
            description: "This should fail.",
            proposed_changes: { new_prompt: "hack" },
          },
          TEST_IDS.testUser1 // not a member of demo_science
        )
      ).rejects.toThrow(GovernanceError);

      try {
        await createProposal(
          {
            community_id: TEST_IDS.communityDemoScience,
            proposal_type: "modify_prompt",
            title: "External proposal",
            description: "This should fail.",
            proposed_changes: { new_prompt: "hack" },
          },
          TEST_IDS.testUser1
        );
      } catch (err) {
        expect((err as GovernanceError).code).toBe("NOT_MEMBER");
      }
    });

    it("should reject proposals from new members (< 7 days)", async () => {
      // Create a fresh membership
      await db.exec(
        `INSERT INTO community_memberships (user_id, community_id, role, joined_at)
         VALUES ('${TEST_IDS.testUser1}', '${TEST_IDS.communityDemoScience}', 'member', NOW())`
      );

      await expect(
        createProposal(
          {
            community_id: TEST_IDS.communityDemoScience,
            proposal_type: "modify_prompt",
            title: "Too early",
            description: "Member too new.",
            proposed_changes: { new_prompt: "test" },
          },
          TEST_IDS.testUser1
        )
      ).rejects.toThrow(GovernanceError);

      try {
        await createProposal(
          {
            community_id: TEST_IDS.communityDemoScience,
            proposal_type: "modify_prompt",
            title: "Too early",
            description: "Member too new.",
            proposed_changes: { new_prompt: "test" },
          },
          TEST_IDS.testUser1
        );
      } catch (err) {
        expect((err as GovernanceError).code).toBe("INSUFFICIENT_TENURE");
      }

      // Clean up
      await db.exec(
        `DELETE FROM community_memberships
         WHERE user_id = '${TEST_IDS.testUser1}'
         AND community_id = '${TEST_IDS.communityDemoScience}'`
      );
    });

    it("should reject proposals for non-existent community", async () => {
      await expect(
        createProposal(
          {
            community_id: "99999999-9999-9999-9999-999999999999",
            proposal_type: "modify_prompt",
            title: "Ghost community",
            description: "This community does not exist.",
            proposed_changes: { new_prompt: "test" },
          },
          TEST_IDS.testUser1
        )
      ).rejects.toThrow(GovernanceError);
    });
  });

  // ─── Read Proposals ────────────────────────────────────────

  describe("getProposalById", () => {
    it("should return a proposal by ID", async () => {
      const created = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Findable proposal",
          description: "This proposal can be found by ID.",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      const found = await getProposalById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe("Findable proposal");
      expect(found!.creator_username).toBeTruthy();
      expect(found!.community_name).toBeTruthy();
    });

    it("should return null for non-existent proposal", async () => {
      const result = await getProposalById("99999999-9999-9999-9999-999999999999");
      expect(result).toBeNull();
    });
  });

  describe("listProposals", () => {
    it("should list proposals for a community", async () => {
      await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Proposal 1",
          description: "First proposal",
          proposed_changes: { new_prompt: "test 1" },
        },
        TEST_IDS.testUser2
      );
      await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "addendum_prompt",
          title: "Proposal 2",
          description: "Second proposal",
          proposed_changes: { addendum: "test 2" },
        },
        TEST_IDS.testUser2
      );

      const result = await listProposals({
        community_id: TEST_IDS.communityTestTech,
        limit: 25,
        offset: 0,
      });

      expect(result.length).toBe(2);
    });

    it("should filter by status", async () => {
      await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Discussion proposal",
          description: "In discussion",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      const discussion = await listProposals({
        community_id: TEST_IDS.communityTestTech,
        status: "discussion",
        limit: 25,
        offset: 0,
      });
      expect(discussion.length).toBe(1);

      const voting = await listProposals({
        community_id: TEST_IDS.communityTestTech,
        status: "voting",
        limit: 25,
        offset: 0,
      });
      expect(voting.length).toBe(0);
    });

    it("should paginate correctly", async () => {
      await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Paginate 1",
          description: "Test",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );
      await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Paginate 2",
          description: "Test",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      const page1 = await listProposals({
        community_id: TEST_IDS.communityTestTech,
        limit: 1,
        offset: 0,
      });
      expect(page1.length).toBe(1);

      const page2 = await listProposals({
        community_id: TEST_IDS.communityTestTech,
        limit: 1,
        offset: 1,
      });
      expect(page2.length).toBe(1);
      expect(page2[0].id).not.toBe(page1[0].id);
    });
  });

  // ─── Vote on Proposal ─────────────────────────────────────

  describe("voteOnProposal", () => {
    it("should allow voting on a proposal in voting status", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Votable proposal",
          description: "Let's vote!",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      // Move to voting status (bypass discussion period)
      await db.exec(
        `UPDATE proposals SET status = 'voting', discussion_ends_at = NOW() - INTERVAL '1 hour'
         WHERE id = '${proposal.id}'`
      );

      const vote = await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);

      expect(vote).toBeDefined();
      expect(vote.vote).toBe("for");
      expect(vote.proposal_id).toBe(proposal.id);
      expect(vote.user_id).toBe(TEST_IDS.testUser1);
    });

    it("should increment votes_for for value 1", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "For vote test",
          description: "Test for vote",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals SET status = 'voting', discussion_ends_at = NOW() - INTERVAL '1 hour'
         WHERE id = '${proposal.id}'`
      );

      await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);

      const updated = await getProposalById(proposal.id);
      expect(updated!.votes_for).toBe(1);
      expect(updated!.votes_against).toBe(0);
    });

    it("should increment votes_against for value -1", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Against vote test",
          description: "Test against vote",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals SET status = 'voting', discussion_ends_at = NOW() - INTERVAL '1 hour'
         WHERE id = '${proposal.id}'`
      );

      await voteOnProposal(proposal.id, TEST_IDS.testUser1, -1);

      const updated = await getProposalById(proposal.id);
      expect(updated!.votes_for).toBe(0);
      expect(updated!.votes_against).toBe(1);
    });

    it("should reject duplicate votes", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "No double vote",
          description: "Cannot vote twice",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals SET status = 'voting', discussion_ends_at = NOW() - INTERVAL '1 hour'
         WHERE id = '${proposal.id}'`
      );

      await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);

      await expect(
        voteOnProposal(proposal.id, TEST_IDS.testUser1, -1)
      ).rejects.toThrow(GovernanceError);

      try {
        await voteOnProposal(proposal.id, TEST_IDS.testUser1, -1);
      } catch (err) {
        expect((err as GovernanceError).code).toBe("ALREADY_VOTED");
      }
    });

    it("should reject voting during discussion period", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Still discussing",
          description: "Cannot vote yet",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      // Proposal is in discussion status with future discussion_ends_at
      await expect(
        voteOnProposal(proposal.id, TEST_IDS.testUser1, 1)
      ).rejects.toThrow(GovernanceError);

      try {
        await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);
      } catch (err) {
        expect((err as GovernanceError).code).toBe("NOT_VOTING");
      }
    });

    it("should auto-transition from discussion to voting when discussion period ends", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Auto transition",
          description: "Should auto-transition",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      // Set discussion_ends_at to the past but keep voting_ends_at in future
      await db.exec(
        `UPDATE proposals
         SET discussion_ends_at = NOW() - INTERVAL '1 hour',
             voting_ends_at = NOW() + INTERVAL '7 days'
         WHERE id = '${proposal.id}'`
      );

      const vote = await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);
      expect(vote).toBeDefined();

      // Proposal should now be in voting status
      const updated = await getProposalById(proposal.id);
      expect(updated!.status).toBe("voting");
    });

    it("should reject voting on non-existent proposal", async () => {
      await expect(
        voteOnProposal("99999999-9999-9999-9999-999999999999", TEST_IDS.testUser1, 1)
      ).rejects.toThrow(GovernanceError);
    });

    it("should reject voting from non-members", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Non-member vote",
          description: "Non-member should not vote",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals SET status = 'voting', discussion_ends_at = NOW() - INTERVAL '1 hour'
         WHERE id = '${proposal.id}'`
      );

      // Use a user who is not a member of test_tech — but all test users are members
      // So we temporarily remove testUser1's membership
      await db.exec(
        `DELETE FROM community_memberships
         WHERE user_id = '${TEST_IDS.testUser1}'
         AND community_id = '${TEST_IDS.communityTestTech}'`
      );

      await expect(
        voteOnProposal(proposal.id, TEST_IDS.testUser1, 1)
      ).rejects.toThrow(GovernanceError);

      // Restore
      await db.exec(
        `INSERT INTO community_memberships (user_id, community_id, role, joined_at)
         VALUES ('${TEST_IDS.testUser1}', '${TEST_IDS.communityTestTech}', 'admin', NOW() - INTERVAL '30 days')`
      );
    });

    it("should reject voting after voting period ends", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Expired vote",
          description: "Voting ended",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour'
         WHERE id = '${proposal.id}'`
      );

      await expect(
        voteOnProposal(proposal.id, TEST_IDS.testUser1, 1)
      ).rejects.toThrow(GovernanceError);

      try {
        await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);
      } catch (err) {
        expect((err as GovernanceError).code).toBe("VOTING_ENDED");
      }
    });

    it("should reject voting on passed/failed proposals", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Already passed",
          description: "Cannot vote on passed proposals",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals SET status = 'passed' WHERE id = '${proposal.id}'`
      );

      await expect(
        voteOnProposal(proposal.id, TEST_IDS.testUser1, 1)
      ).rejects.toThrow(GovernanceError);

      try {
        await voteOnProposal(proposal.id, TEST_IDS.testUser1, 1);
      } catch (err) {
        expect((err as GovernanceError).code).toBe("INVALID_STATUS");
      }
    });
  });

  // ─── Proposal Lifecycle ────────────────────────────────────

  describe("checkAndExecuteProposal", () => {
    it("should not process a proposal whose voting period has not ended", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Still open",
          description: "Voting not done",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      const result = await checkAndExecuteProposal(proposal.id);
      expect(result.status).toBe("discussion");
    });

    it("should pass a proposal with majority and quorum", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Should pass",
          description: "Majority + quorum",
          proposed_changes: { new_prompt: "New approved prompt text" },
        },
        TEST_IDS.testUser2
      );

      // Set voting period to have ended, add enough votes
      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour',
             votes_for = 2,
             votes_against = 0
         WHERE id = '${proposal.id}'`
      );

      // Community has 3 members, quorum is 10% default = ceil(3*10/100) = 1
      // 2 votes total >= 1 quorum, 2 for > 0 against
      const result = await checkAndExecuteProposal(proposal.id);
      expect(["passed", "implemented"]).toContain(result.status);
    });

    it("should fail a proposal without quorum", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "No quorum",
          description: "Not enough votes",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      // Set high quorum so 0 votes fails
      await db.exec(
        `UPDATE communities SET governance_config =
           jsonb_set(governance_config, '{quorum_percentage}', '100')
         WHERE id = '${TEST_IDS.communityTestTech}'`
      );

      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour',
             votes_for = 1,
             votes_against = 0
         WHERE id = '${proposal.id}'`
      );

      const result = await checkAndExecuteProposal(proposal.id);
      expect(result.status).toBe("failed");

      // Restore governance config
      await db.exec(
        `UPDATE communities SET governance_config =
           jsonb_set(governance_config, '{quorum_percentage}', '10')
         WHERE id = '${TEST_IDS.communityTestTech}'`
      );
    });

    it("should fail a proposal where majority is against", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Majority against",
          description: "More against than for",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour',
             votes_for = 0,
             votes_against = 2
         WHERE id = '${proposal.id}'`
      );

      const result = await checkAndExecuteProposal(proposal.id);
      expect(result.status).toBe("failed");
    });

    it("should execute modify_prompt proposal by replacing community prompt", async () => {
      const newPrompt = "This is the brand new AI agent prompt for the community.";
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Replace prompt",
          description: "Full prompt replacement",
          proposed_changes: { new_prompt: newPrompt },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour',
             votes_for = 3,
             votes_against = 0
         WHERE id = '${proposal.id}'`
      );

      await checkAndExecuteProposal(proposal.id);

      // Check community prompt was updated
      const community = await db.query(
        `SELECT ai_prompt, ai_prompt_version FROM communities WHERE id = $1`,
        [TEST_IDS.communityTestTech]
      );
      expect(community.rows[0].ai_prompt).toBe(newPrompt);
      expect(community.rows[0].ai_prompt_version).toBe(2);

      // Check prompt history was logged
      const history = await db.query(
        `SELECT * FROM ai_prompt_history
         WHERE entity_id = $1 AND proposal_id = $2`,
        [TEST_IDS.communityTestTech, proposal.id]
      );
      expect(history.rows.length).toBe(1);
      expect(history.rows[0].prompt_text).toBe(newPrompt);
    });

    it("should execute addendum_prompt by appending to existing prompt", async () => {
      const addendum = "Additional rule: No memes on weekdays.";
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "addendum_prompt",
          title: "Add meme rule",
          description: "Append a meme rule",
          proposed_changes: { addendum },
        },
        TEST_IDS.testUser2
      );

      // Get original prompt
      const before = await db.query(
        `SELECT ai_prompt FROM communities WHERE id = $1`,
        [TEST_IDS.communityTestTech]
      );
      const originalPrompt = before.rows[0].ai_prompt;

      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour',
             votes_for = 3,
             votes_against = 0
         WHERE id = '${proposal.id}'`
      );

      await checkAndExecuteProposal(proposal.id);

      const after = await db.query(
        `SELECT ai_prompt FROM communities WHERE id = $1`,
        [TEST_IDS.communityTestTech]
      );
      expect(after.rows[0].ai_prompt).toContain(originalPrompt);
      expect(after.rows[0].ai_prompt).toContain(addendum);
    });

    it("should execute change_settings by merging into governance_config", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "change_settings",
          title: "Change quorum",
          description: "Change quorum to 25%",
          proposed_changes: { settings: { quorum_percentage: 25 } },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals
         SET status = 'voting',
             discussion_ends_at = NOW() - INTERVAL '10 days',
             voting_ends_at = NOW() - INTERVAL '1 hour',
             votes_for = 3,
             votes_against = 0
         WHERE id = '${proposal.id}'`
      );

      await checkAndExecuteProposal(proposal.id);

      const after = await db.query(
        `SELECT governance_config FROM communities WHERE id = $1`,
        [TEST_IDS.communityTestTech]
      );
      expect(after.rows[0].governance_config.quorum_percentage).toBe(25);

      // Restore
      await db.exec(
        `UPDATE communities SET governance_config =
           jsonb_set(governance_config, '{quorum_percentage}', '10')
         WHERE id = '${TEST_IDS.communityTestTech}'`
      );
    });

    it("should not re-process already passed proposals", async () => {
      const proposal = await createProposal(
        {
          community_id: TEST_IDS.communityTestTech,
          proposal_type: "modify_prompt",
          title: "Already done",
          description: "Already passed",
          proposed_changes: { new_prompt: "test" },
        },
        TEST_IDS.testUser2
      );

      await db.exec(
        `UPDATE proposals SET status = 'passed'
         WHERE id = '${proposal.id}'`
      );

      const result = await checkAndExecuteProposal(proposal.id);
      expect(result.status).toBe("passed");
    });
  });
});

// ─── Validation Tests ────────────────────────────────────────

describe("proposal validation schemas", () => {
  describe("createProposalSchema", () => {
    it("should accept valid input", () => {
      const result = createProposalSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
        proposal_type: "modify_prompt",
        title: "Valid proposal",
        description: "A valid proposal description",
        proposed_changes: { new_prompt: "new prompt text" },
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid community_id", () => {
      const result = createProposalSchema.safeParse({
        community_id: "not-a-uuid",
        proposal_type: "modify_prompt",
        title: "Test",
        description: "Test",
        proposed_changes: { new_prompt: "test" },
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid proposal types", () => {
      const result = createProposalSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
        proposal_type: "invalid_type",
        title: "Test",
        description: "Test",
        proposed_changes: { new_prompt: "test" },
      });
      expect(result.success).toBe(false);
    });

    it("should accept all 3 valid proposal types", () => {
      const types = ["modify_prompt", "addendum_prompt", "change_settings"];
      for (const proposal_type of types) {
        const result = createProposalSchema.safeParse({
          community_id: "30000000-0000-0000-0000-000000000001",
          proposal_type,
          title: "Test",
          description: "Test",
          proposed_changes: { key: "value" },
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject titles over 200 chars", () => {
      const result = createProposalSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
        proposal_type: "modify_prompt",
        title: "x".repeat(201),
        description: "Test",
        proposed_changes: { new_prompt: "test" },
      });
      expect(result.success).toBe(false);
    });

    it("should reject descriptions over 5000 chars", () => {
      const result = createProposalSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
        proposal_type: "modify_prompt",
        title: "Test",
        description: "x".repeat(5001),
        proposed_changes: { new_prompt: "test" },
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty proposed_changes", () => {
      const result = createProposalSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
        proposal_type: "modify_prompt",
        title: "Test",
        description: "Test",
        proposed_changes: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe("listProposalsSchema", () => {
    it("should accept valid community_id", () => {
      const result = listProposalsSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
      });
      expect(result.success).toBe(true);
    });

    it("should accept status filter", () => {
      for (const status of ["discussion", "voting", "passed", "failed", "implemented"]) {
        const result = listProposalsSchema.safeParse({
          community_id: "30000000-0000-0000-0000-000000000001",
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const result = listProposalsSchema.safeParse({
        community_id: "30000000-0000-0000-0000-000000000001",
        status: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("voteProposalSchema", () => {
    it("should accept value 1 (for)", () => {
      const result = voteProposalSchema.safeParse({ value: 1 });
      expect(result.success).toBe(true);
    });

    it("should accept value -1 (against)", () => {
      const result = voteProposalSchema.safeParse({ value: -1 });
      expect(result.success).toBe(true);
    });

    it("should reject value 0", () => {
      const result = voteProposalSchema.safeParse({ value: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject value 2", () => {
      const result = voteProposalSchema.safeParse({ value: 2 });
      expect(result.success).toBe(false);
    });
  });
});
