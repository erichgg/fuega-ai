"""Follow-up sequence engine for outreach leads."""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from backend.app.database.models import Lead, LeadStage
import structlog

logger = structlog.get_logger()


# ── Follow-up schedule ──────────────────────────────────────────────────────

FOLLOWUP_SCHEDULE = [
    {"day": 0, "type": "initial", "channel": "email+whatsapp"},
    {"day": 3, "type": "followup_1", "channel": "email"},
    {"day": 7, "type": "followup_2", "channel": "whatsapp"},
    {"day": 14, "type": "final", "channel": "email"},
]


# ── Follow-up message templates ─────────────────────────────────────────────

FOLLOWUP_TEMPLATES = {
    "initial": {
        "email_subject": {
            "es": "Ayudamos a {business_name} a conseguir mas clientes",
            "pt": "Ajudamos {business_name} a conquistar mais clientes",
        },
        "email_body": {
            "es": (
                "Hola!\n\n"
                "Soy Ana de Fuega AI. Notamos que {business_name} tiene {google_rating_line} "
                "pero {digital_gap_line}.\n\n"
                "{value_prop_line}\n\n"
                "Me encantaria platicarte como podemos ayudar. Tienes 15 minutos esta semana?\n\n"
                "Saludos,\nAna - Fuega AI"
            ),
            "pt": (
                "Ola!\n\n"
                "Sou Ana da Fuega AI. Notamos que {business_name} tem {google_rating_line} "
                "mas {digital_gap_line}.\n\n"
                "{value_prop_line}\n\n"
                "Adoraria conversar sobre como podemos ajudar. Tem 15 minutos esta semana?\n\n"
                "Abracos,\nAna - Fuega AI"
            ),
        },
        "whatsapp": {
            "es": (
                "Hola! Soy Ana de Fuega AI. Vi que {business_name} tiene {google_rating_line} "
                "pero {digital_gap_line}. {value_prop_line} Te puedo contar mas?"
            ),
            "pt": (
                "Ola! Sou Ana da Fuega AI. Vi que {business_name} tem {google_rating_line} "
                "mas {digital_gap_line}. {value_prop_line} Posso te contar mais?"
            ),
        },
    },
    "followup_1": {
        "email_subject": {
            "es": "Seguimiento — una idea para {business_name}",
            "pt": "Seguimento — uma ideia para {business_name}",
        },
        "email_body": {
            "es": (
                "Hola!\n\n"
                "Queria dar seguimiento a mi mensaje anterior. {specific_benefit}\n\n"
                "Muchos negocios como el tuyo han visto resultados en las primeras 4 semanas. "
                "Si te interesa, con gusto te preparo una propuesta sin compromiso.\n\n"
                "Saludos,\nAna - Fuega AI"
            ),
            "pt": (
                "Ola!\n\n"
                "Queria dar seguimento a minha mensagem anterior. {specific_benefit}\n\n"
                "Muitos negocios como o seu viram resultados nas primeiras 4 semanas. "
                "Se tiver interesse, preparo uma proposta sem compromisso.\n\n"
                "Abracos,\nAna - Fuega AI"
            ),
        },
        "whatsapp": {
            "es": "Hola! Solo queria dar seguimiento. {specific_benefit} Me avisas si te interesa saber mas.",
            "pt": "Ola! So queria dar seguimento. {specific_benefit} Me avisa se tiver interesse.",
        },
    },
    "followup_2": {
        "email_subject": {
            "es": "{business_name} — ultima oportunidad esta semana",
            "pt": "{business_name} — ultima oportunidade esta semana",
        },
        "email_body": {
            "es": (
                "Hola!\n\n"
                "Soy de Fuega AI, te escribi la semana pasada sobre como ayudar a "
                "{business_name} a crecer digitalmente.\n\n"
                "{value_prop_line}\n\n"
                "Si prefieres, tambien podemos hablar por WhatsApp. Solo responde y coordinamos.\n\n"
                "Saludos,\nAna - Fuega AI"
            ),
            "pt": (
                "Ola!\n\n"
                "Sou da Fuega AI, te escrevi na semana passada sobre como ajudar "
                "{business_name} a crescer digitalmente.\n\n"
                "{value_prop_line}\n\n"
                "Se preferir, tambem podemos conversar por WhatsApp. So responda e combinamos.\n\n"
                "Abracos,\nAna - Fuega AI"
            ),
        },
        "whatsapp": {
            "es": (
                "Hola! Soy de Fuega AI, te escribi la semana pasada. "
                "Solo queria saber si te interesa explorar como hacer crecer {business_name} en linea. "
                "Sin compromiso!"
            ),
            "pt": (
                "Ola! Sou da Fuega AI, te escrevi semana passada. "
                "So queria saber se tem interesse em explorar como fazer {business_name} crescer online. "
                "Sem compromisso!"
            ),
        },
    },
    "final": {
        "email_subject": {
            "es": "Ultimo mensaje — aqui estamos para {business_name}",
            "pt": "Ultima mensagem — estamos aqui para {business_name}",
        },
        "email_body": {
            "es": (
                "Hola!\n\n"
                "Entiendo que estas ocupado/a. Este es mi ultimo mensaje por ahora.\n\n"
                "Si en algun momento quieres explorar como hacer crecer tu negocio "
                "digitalmente, aqui estamos. Solo responde a este correo y con gusto te ayudamos.\n\n"
                "Te deseo mucho exito con {business_name}!\n\n"
                "Saludos,\nAna - Fuega AI"
            ),
            "pt": (
                "Ola!\n\n"
                "Entendo que esta ocupado/a. Esta e minha ultima mensagem por agora.\n\n"
                "Se em algum momento quiser explorar como fazer seu negocio "
                "crescer digitalmente, estamos aqui. So responda este email e teremos prazer em ajudar.\n\n"
                "Desejo muito sucesso com {business_name}!\n\n"
                "Abracos,\nAna - Fuega AI"
            ),
        },
        "whatsapp": {
            "es": (
                "Hola! Entiendo que estas ocupado/a. Si en algun momento quieres explorar como "
                "hacer crecer tu negocio digitalmente, aqui estamos. Mucho exito!"
            ),
            "pt": (
                "Ola! Entendo que esta ocupado/a. Se em algum momento quiser explorar como "
                "fazer seu negocio crescer online, estamos aqui. Muito sucesso!"
            ),
        },
    },
}


def _build_personalization(lead: Lead) -> dict:
    """Build personalization variables from lead data."""
    lang = lead.language or "es"

    # Google rating line
    if lead.google_rating:
        if lang == "pt":
            google_rating_line = f"uma avaliacao de {lead.google_rating} estrelas no Google"
        else:
            google_rating_line = f"una calificacion de {lead.google_rating} estrellas en Google"
        if lead.review_count:
            if lang == "pt":
                google_rating_line += f" com {lead.review_count} avaliacoes"
            else:
                google_rating_line += f" con {lead.review_count} resenas"
    else:
        if lang == "pt":
            google_rating_line = "uma boa reputacao"
        else:
            google_rating_line = "buena reputacion"

    # Digital gap line
    gaps = []
    if lead.has_website is False:
        if lang == "pt":
            gaps.append("nao tem site")
        else:
            gaps.append("no tiene pagina web")
    if lead.has_social is False:
        if lang == "pt":
            gaps.append("pouca presenca em redes sociais")
        else:
            gaps.append("poca presencia en redes sociales")
    if not gaps:
        if lang == "pt":
            digital_gap_line = "poderia ter mais presenca digital"
        else:
            digital_gap_line = "podria tener mas presencia digital"
    else:
        digital_gap_line = " y ".join(gaps) if lang == "es" else " e ".join(gaps)

    # Value prop line based on biggest gap
    if lead.has_website is False:
        if lang == "pt":
            value_prop_line = "Podemos criar um site profissional para voce em menos de 2 semanas"
        else:
            value_prop_line = "Te podemos crear una pagina web profesional en menos de 2 semanas"
    elif lead.has_social is False:
        if lang == "pt":
            value_prop_line = "Gerenciamos suas redes sociais para atrair mais clientes"
        else:
            value_prop_line = "Manejamos tus redes sociales para atraer mas clientes"
    else:
        if lang == "pt":
            value_prop_line = "Otimizamos sua presenca digital para voce aparecer mais no Google"
        else:
            value_prop_line = "Optimizamos tu presencia digital para que aparezcas mas en Google"

    # Specific benefit for followup_1
    if lead.has_website is False:
        if lang == "pt":
            specific_benefit = "Criar um site profissional pode aumentar suas vendas em ate 30%."
        else:
            specific_benefit = "Crear una pagina web profesional puede aumentar tus ventas hasta un 30%."
    elif lead.has_social is False:
        if lang == "pt":
            specific_benefit = "Negocios com redes sociais ativas recebem em media 40% mais consultas."
        else:
            specific_benefit = "Negocios con redes sociales activas reciben en promedio 40% mas consultas."
    else:
        if lang == "pt":
            specific_benefit = "Uma estrategia digital completa pode dobrar sua visibilidade online em 30 dias."
        else:
            specific_benefit = "Una estrategia digital completa puede duplicar tu visibilidad en linea en 30 dias."

    return {
        "business_name": lead.business_name,
        "google_rating_line": google_rating_line,
        "digital_gap_line": digital_gap_line,
        "value_prop_line": value_prop_line,
        "specific_benefit": specific_benefit,
    }


def _get_current_followup_step(lead: Lead) -> dict | None:
    """Determine which follow-up step a lead is currently on."""
    count = lead.followup_count or 0
    if count >= len(FOLLOWUP_SCHEDULE):
        return None
    return FOLLOWUP_SCHEDULE[count]


def _get_next_followup_step(lead: Lead) -> dict | None:
    """Determine the next follow-up step for a lead."""
    count = lead.followup_count or 0
    next_idx = count  # followup_count is the number completed, so next is at that index
    if next_idx >= len(FOLLOWUP_SCHEDULE):
        return None
    return FOLLOWUP_SCHEDULE[next_idx]


async def get_pending_followups(db: AsyncSession) -> list[Lead]:
    """Return leads that need their next follow-up touch today."""
    now = datetime.utcnow()

    # Get leads in outreach stages that haven't been won/lost/responded
    eligible_stages = [
        LeadStage.OUTREACH_DRAFTED,
        LeadStage.OUTREACH_SENT,
    ]

    result = await db.execute(
        select(Lead).where(
            Lead.stage.in_(eligible_stages),
        ).order_by(Lead.score.desc())
    )
    leads = result.scalars().all()

    pending = []
    for lead in leads:
        followup_count = lead.followup_count or 0

        # All follow-ups exhausted
        if followup_count >= len(FOLLOWUP_SCHEDULE):
            continue

        next_step = FOLLOWUP_SCHEDULE[followup_count]

        # For the initial outreach (day 0), always pending if not yet sent
        if followup_count == 0 and lead.stage == LeadStage.OUTREACH_DRAFTED:
            pending.append(lead)
            continue

        # For subsequent follow-ups, check timing
        if lead.last_followup_at:
            days_since_last = (now - lead.last_followup_at).days
            # Find the day gap between this step and the previous
            if followup_count > 0:
                prev_day = FOLLOWUP_SCHEDULE[followup_count - 1]["day"]
                curr_day = next_step["day"]
                required_gap = curr_day - prev_day
            else:
                required_gap = 0

            if days_since_last >= required_gap:
                pending.append(lead)

    return pending


async def generate_followup(lead: Lead, db: AsyncSession, dry_run: bool = False) -> dict:
    """Generate the appropriate follow-up message for a lead."""
    next_step = _get_next_followup_step(lead)
    if next_step is None:
        raise ValueError(f"All follow-ups exhausted for lead '{lead.business_name}'")

    followup_type = next_step["type"]
    channel = next_step["channel"]
    lang = lead.language or "es"
    if lang not in ("es", "pt"):
        lang = "es"

    templates = FOLLOWUP_TEMPLATES.get(followup_type)
    if not templates:
        raise ValueError(f"Unknown follow-up type: {followup_type}")

    personalization = _build_personalization(lead)

    # Build messages based on channel
    messages = {}

    if "email" in channel:
        subject_tpl = templates["email_subject"].get(lang, templates["email_subject"]["es"])
        body_tpl = templates["email_body"].get(lang, templates["email_body"]["es"])
        messages["email_subject"] = subject_tpl.format(**personalization)
        messages["email_body"] = body_tpl.format(**personalization)

    if "whatsapp" in channel:
        wa_tpl = templates["whatsapp"].get(lang, templates["whatsapp"]["es"])
        messages["whatsapp_message"] = wa_tpl.format(**personalization)

    result = {
        "lead_id": lead.id,
        "business_name": lead.business_name,
        "followup_type": followup_type,
        "followup_number": (lead.followup_count or 0) + 1,
        "total_followups": len(FOLLOWUP_SCHEDULE),
        "channel": channel,
        "language": lang,
        "messages": messages,
        "dry_run": dry_run,
    }

    if not dry_run:
        # Update lead tracking
        lead.followup_count = (lead.followup_count or 0) + 1
        lead.last_followup_at = datetime.utcnow()

        # Update stage if this is the initial send
        if lead.stage == LeadStage.OUTREACH_DRAFTED:
            lead.stage = LeadStage.OUTREACH_SENT

        # If all follow-ups exhausted, mark as lost
        if lead.followup_count >= len(FOLLOWUP_SCHEDULE):
            lead.stage = LeadStage.LOST
            result["stage_updated"] = "lost"
            logger.info("lead_marked_lost_after_followups", lead_id=lead.id, business=lead.business_name)

        await db.commit()
        await db.refresh(lead)
        result["new_stage"] = lead.stage.value

    logger.info(
        "followup_generated",
        lead_id=lead.id,
        followup_type=followup_type,
        channel=channel,
        dry_run=dry_run,
    )

    return result


async def get_followup_history(lead: Lead, db: AsyncSession) -> dict:
    """Get the full follow-up sequence status for a lead."""
    followup_count = lead.followup_count or 0

    sequence = []
    for i, step in enumerate(FOLLOWUP_SCHEDULE):
        status = "completed" if i < followup_count else ("pending" if i == followup_count else "scheduled")
        if followup_count >= len(FOLLOWUP_SCHEDULE) and lead.stage == LeadStage.LOST:
            if i >= followup_count:
                status = "skipped"

        entry = {
            "step": i + 1,
            "day": step["day"],
            "type": step["type"],
            "channel": step["channel"],
            "status": status,
        }

        # If completed, show when
        if status == "completed" and lead.last_followup_at and i == followup_count - 1:
            entry["completed_at"] = lead.last_followup_at.isoformat()

        sequence.append(entry)

    return {
        "lead_id": lead.id,
        "business_name": lead.business_name,
        "current_stage": lead.stage.value if lead.stage else "prospect",
        "followup_count": followup_count,
        "total_steps": len(FOLLOWUP_SCHEDULE),
        "last_followup_at": lead.last_followup_at.isoformat() if lead.last_followup_at else None,
        "all_exhausted": followup_count >= len(FOLLOWUP_SCHEDULE),
        "sequence": sequence,
    }


async def run_daily_followups(db: AsyncSession) -> dict:
    """Daily job: check for pending follow-ups and generate them."""
    pending = await get_pending_followups(db)
    results = []
    errors = []

    for lead in pending:
        try:
            followup_data = await generate_followup(lead, db, dry_run=False)
            results.append(followup_data)
        except Exception as e:
            logger.error("followup_job_error", lead_id=lead.id, error=str(e))
            errors.append({"lead_id": lead.id, "error": str(e)})

    logger.info("daily_followups_complete", sent=len(results), errors=len(errors))
    return {"sent": len(results), "errors": len(errors), "results": results}
