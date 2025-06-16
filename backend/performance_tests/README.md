### API Performance tests

1. Install k6 on your local machine. You can find the installation instructions [here](https://k6.io/docs/getting-started/installation/).
2. Make sure the backend server is running.
3. Run the following command to run the performance tests:
```bash
k6 run --env FIREBASE_API_KEY= --env TEST_USER_EMAIL= --env TEST_USER_PASSWORD= backend/performance_tests/api_test.js
```