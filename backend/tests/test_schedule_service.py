import pytest
from datetime import date, time
from app.services.schedule_service import ScheduleService


def test_resolve_times_after_meal():
    svc = ScheduleService.__new__(ScheduleService)
    times = svc._resolve_times("after_meal", "1일 3회")
    assert len(times) == 3
    assert times[0] == time(8, 30)
    assert times[1] == time(13, 0)
    assert times[2] == time(19, 0)


def test_resolve_times_bedtime():
    svc = ScheduleService.__new__(ScheduleService)
    times = svc._resolve_times("bedtime", "1일 1회")
    assert len(times) == 1
    assert times[0] == time(21, 30)


def test_resolve_times_1_per_day():
    svc = ScheduleService.__new__(ScheduleService)
    times = svc._resolve_times("after_meal", "1일 1회")
    assert len(times) == 1


def test_resolve_times_2_per_day():
    svc = ScheduleService.__new__(ScheduleService)
    times = svc._resolve_times("before_meal", "1일 2회")
    assert len(times) == 2


def test_resolve_times_unknown_timing():
    svc = ScheduleService.__new__(ScheduleService)
    # 알 수 없는 timing은 after_meal 기본값 사용
    times = svc._resolve_times("unknown", "1일 1회")
    assert len(times) == 1
    assert times[0] == time(8, 30)
