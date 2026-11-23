import importlib.util
from pathlib import Path
import tempfile
from threading import Barrier, Event, Lock
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("ai_video", Path(__file__).with_name("ai-video.py"))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ParallelBatchTest(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.workdir = Path(folder.name)
        for name in ("PROMPT.md", "COMPLIANCE_SELF_CHECK_PROMPT.md"):
            (self.workdir / name).write_text("test", encoding="utf-8")
        self.job = {"payload": {
            "project_name": "Biceek", "batch_id": "batch", "run_id": "run",
            "rule_version": "1", "mode": "script", "include_storyboard": False,
            "items": [{"item_id": str(number)} for number in range(1, 5)],
            "output_count": 4, "rules": {"active_constraints": []},
        }}

    def run_batch(self, infer, update):
        with (
            patch.object(worker, "infer", infer),
            patch.object(worker, "update", update),
            patch.object(worker, "prepare_combination", side_effect=lambda item, _: ({"MKT": "DE"}, item)),
            patch.object(worker, "google_trends", return_value={}) as trends,
            patch.object(worker, "combination_elements", return_value=[]),
            patch.object(worker, "audit_artifacts", return_value=[]),
        ):
            worker.run_job(self.job, self.workdir)
            trends.assert_called_once_with("DE")

    def test_two_items_overlap_and_results_follow_submission_order(self):
        pair = Barrier(2, timeout=5)
        second_done = Event()
        lock = Lock()
        active = peak = 0
        events = []

        def infer(job, folder, prompt, context, schema):
            nonlocal active, peak
            number = context["items"][0]["item_id"]
            with lock:
                active += 1
                peak = max(peak, active)
            try:
                if number in ("1", "2"):
                    pair.wait()
                if number == "1":
                    self.assertTrue(second_done.wait(5))
                if number == "3":
                    raise ValueError("prohibited_terms")
                return {"title": [number, number], "copy": {}, "rationale": {}}
            finally:
                with lock:
                    active -= 1

        def update(job, stage, count, **kwargs):
            events.append((stage, count, kwargs))
            if stage == "item_done" and kwargs["item_no"] == 2:
                second_done.set()

        self.run_batch(infer, update)
        self.assertEqual(peak, 2)
        progress = [count for _, count, _ in events]
        self.assertEqual(progress, sorted(progress))
        finished = [(stage, count, event["item_no"]) for stage, count, event in events
                    if stage in ("item_done", "item_rejected")]
        self.assertEqual([count for _, count, _ in finished], [1, 2, 3, 4])
        self.assertEqual(finished[0], ("item_done", 1, 2))
        self.assertEqual([script["id"] for script in events[-1][2]["result"]["scripts"]],
                         ["batch-1", "batch-2", "batch-4"])

    def test_cancelling_batch_stops_both_inflight_items(self):
        pair = Barrier(2, timeout=5)
        observed_stop = Event()
        calls = []
        stages = []

        def infer(job, folder, prompt, context, schema):
            number = context["items"][0]["item_id"]
            calls.append(number)
            pair.wait()
            if number == "1":
                raise worker.JobCancelled()
            if job["stop"].wait(5):
                observed_stop.set()
                raise worker.JobCancelled()
            self.fail("The other combination did not receive the stop signal")

        def update(job, stage, count, **kwargs):
            stages.append(stage)

        with self.assertRaises(worker.JobCancelled):
            self.run_batch(infer, update)
        self.assertEqual(set(calls), {"1", "2"})
        self.assertTrue(observed_stop.is_set())
        self.assertNotIn("saving", stages)


if __name__ == "__main__":
    unittest.main()
