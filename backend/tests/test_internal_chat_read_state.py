import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from routes.internal_chat import _decorate_messages_with_read_state, _parse_timestamp


class InternalChatReadStateTest(unittest.TestCase):
    def test_parse_timestamp_normalizes_utc(self):
        parsed = _parse_timestamp("2026-05-23T10:15:00Z")
        self.assertEqual(parsed.tzinfo, timezone.utc)
        self.assertEqual(parsed.hour, 10)

    def test_message_is_read_when_all_recipients_read_after_created_at(self):
        messages = [
            {
                "id": "m1",
                "sender_user_id": "sender",
                "created_at": "2026-05-23T10:00:00+00:00",
                "message_text": "hello",
            }
        ]
        read_state = {
            "sender": datetime(2026, 5, 23, 10, 0, tzinfo=timezone.utc),
            "recipient": datetime(2026, 5, 23, 10, 1, tzinfo=timezone.utc),
        }

        with patch("routes.internal_chat._participant_read_state", return_value=read_state):
            decorated = _decorate_messages_with_read_state(messages, "conversation")

        self.assertTrue(decorated[0]["read_by_all"])
        self.assertEqual(decorated[0]["read_count"], 1)
        self.assertEqual(decorated[0]["recipient_count"], 1)

    def test_message_is_unread_when_any_recipient_has_not_read_it(self):
        messages = [
            {
                "id": "m1",
                "sender_user_id": "sender",
                "created_at": "2026-05-23T10:00:00+00:00",
                "message_text": "hello",
            }
        ]
        read_state = {
            "sender": datetime(2026, 5, 23, 10, 0, tzinfo=timezone.utc),
            "recipient": datetime(2026, 5, 23, 9, 59, tzinfo=timezone.utc),
        }

        with patch("routes.internal_chat._participant_read_state", return_value=read_state):
            decorated = _decorate_messages_with_read_state(messages, "conversation")

        self.assertFalse(decorated[0]["read_by_all"])
        self.assertEqual(decorated[0]["read_count"], 0)
        self.assertEqual(decorated[0]["recipient_count"], 1)


if __name__ == "__main__":
    unittest.main()
