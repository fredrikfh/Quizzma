import unittest
from processing.preprocessing.openai_language_processing import process


class TestTranslationAndSpelling(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def verify_result(
        result: str, expected_contains: list[str], expected_not_contains: list[str]
    ) -> list[str]:
        """
        Verifies that the result contains all expected substrings and does not contain any of the forbidden ones.
        Returns a list of error messages. An empty list indicates a passing test.
        """
        errors = []
        lower_result = result.lower()
        for substr in expected_contains:
            if substr.lower() not in lower_result:
                errors.append(f"Expected substring '{substr}' not found.")
        for substr in expected_not_contains:
            if substr.lower() in lower_result:
                errors.append(f"Unexpected substring '{substr}' found.")
        return errors

    async def test_translation_and_spelling(self):
        test_cases = [
            {
                "description": "Translate French to English",
                "input_text": ["Bonjour, comment ça va?"],
                "expected_contains": ["hello", "how are you"],
                "expected_not_contains": ["bonjour"],
            },
            {
                "description": "Translate Spanish to English",
                "input_text": ["Hola, ¿cómo estás?"],
                "expected_contains": ["hello", "how are you"],
                "expected_not_contains": ["hola"],
            },
            {
                "description": "Translate German to English",
                "input_text": ["Guten Tag, wie geht es Ihnen?"],
                "expected_contains": ["how are you"],
                "expected_not_contains": ["guten"],
            },
            {
                "description": "English spelling correction",
                "input_text": ["I havv goood speling."],
                "expected_contains": ["i have good spelling"],
                "expected_not_contains": ["havv", "goood"],
            },
        ]

        for case in test_cases:
            with self.subTest(case["description"]):
                result_list = await process(case["input_text"])
                result_text = " ".join(
                    result_list
                )  # Join the list of strings into a single string for easier checking
                errors = self.verify_result(
                    result_text,
                    case["expected_contains"],
                    case["expected_not_contains"],
                )
                self.assertEqual(
                    errors,
                    [],
                    msg=f"Test '{case['description']}' failed with errors: {errors}",
                )


if __name__ == "__main__":
    unittest.main()
