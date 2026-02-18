"""Twitter/X integration via tweepy."""
import tweepy
from backend.app.config import get_settings
import structlog

logger = structlog.get_logger()


def _get_client() -> tweepy.Client:
    """Get authenticated Twitter API v2 client."""
    settings = get_settings()
    return tweepy.Client(
        consumer_key=settings.twitter_api_key,
        consumer_secret=settings.twitter_api_secret,
        access_token=settings.twitter_access_token,
        access_token_secret=settings.twitter_access_secret,
    )


def _get_api_v1() -> tweepy.API:
    """Get Twitter API v1.1 for media uploads."""
    settings = get_settings()
    auth = tweepy.OAuth1UserHandler(
        settings.twitter_api_key,
        settings.twitter_api_secret,
        settings.twitter_access_token,
        settings.twitter_access_secret,
    )
    return tweepy.API(auth)


async def post_tweet(text: str, media_ids: list[str] | None = None) -> dict:
    """Post a tweet. Returns tweet URL and ID."""
    client = _get_client()

    kwargs = {"text": text}
    if media_ids:
        kwargs["media_ids"] = media_ids

    response = client.create_tweet(**kwargs)
    tweet_id = response.data["id"]
    # Construct URL (we don't know the username from the client alone)
    tweet_url = f"https://twitter.com/i/status/{tweet_id}"

    logger.info("twitter_posted", tweet_id=tweet_id, chars=len(text))
    return {"tweet_id": tweet_id, "url": tweet_url, "text": text}


async def upload_media(file_path: str) -> dict:
    """Upload media file to Twitter. Returns media_id for attaching to tweets."""
    api = _get_api_v1()
    media = api.media_upload(filename=file_path)
    logger.info("twitter_media_uploaded", media_id=media.media_id_string)
    return {"media_id": media.media_id_string}
