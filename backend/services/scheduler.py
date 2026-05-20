from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config import AUTOMATION_CRON_HOUR_UTC, AUTOMATION_CRON_MINUTE_UTC
from services.automation_service import run_renewal_automation
from services.notification_service import check_expiring_contracts

_scheduler = None


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_renewal_automation,
        CronTrigger(hour=AUTOMATION_CRON_HOUR_UTC, minute=AUTOMATION_CRON_MINUTE_UTC),
        kwargs={"triggered_by": "cron"},
        id="daily_renewal_automation",
        replace_existing=True,
    )
    _scheduler.add_job(
        check_expiring_contracts,
        CronTrigger(hour=AUTOMATION_CRON_HOUR_UTC, minute=AUTOMATION_CRON_MINUTE_UTC),
        id="daily_expiry_notifications",
        replace_existing=True,
    )
    _scheduler.start()
    print(
        f"[scheduler] Daily renewal automation and expiry notifications scheduled at "
        f"{AUTOMATION_CRON_HOUR_UTC:02d}:{AUTOMATION_CRON_MINUTE_UTC:02d} UTC"
    )
    return _scheduler
