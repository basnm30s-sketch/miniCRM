const { exec } = require('child_process');

console.log('🚀 Running Unit Regression Tests...');

// Execute Jest and output as JSON
exec('npx jest --json', { maxBuffer: 1024 * 10000 }, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Exec error:', error);
        console.error('Stderr:', stderr); // Jest often warns here, which is fine, but good to see
    }

    let results;
    try {
        results = JSON.parse(stdout);
    } catch (e) {
        console.error('❌ Failed to parse test results:', e);
        console.error('Raw output:', stdout);
        process.exit(1);
    }

    const totalTests = results.numTotalTests;
    const passedTests = results.numPassedTests;
    const failedTests = results.numFailedTests;
    const success = results.success;

    console.log('\n📊 Test Summary:');
    console.log(`   Total:  ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);

    if (failedTests > 0) {
        console.log('\n❌ Failed Test Cases:');
        results.testResults.forEach(suite => {
            suite.assertionResults.forEach(test => {
                if (test.status === 'failed') {
                    console.log(`   - [${suite.name.split(/\\|\//).pop()}] ${test.fullName}`);
                    test.failureMessages.forEach(msg => {
                        console.log(`     Error: ${msg.split('\n')[0]}`); // Print concise error
                    });
                }
            });
        });
    }

    if (!success) {
        console.error('\n❌ Automation tests failed. Build prevented.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed. Proceeding...');
        process.exit(0);
    }
});
