const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(() => global.fetch(...args));

const BASE_URL = 'http://localhost:3000';
const USER_ID = '11111111-1111-1111-1111-111111111111';

async function runTestSuite() {
    console.log("==================================================================");
    console.log("🚀 STARTING COGNIPATH PRODUCTION END-TO-END VERIFICATION SUITE 🚀");
    console.log("==================================================================\n");

    let totalTests = 0;
    let passedTests = 0;

    const testEndpoint = async (name, url, options = {}) => {
        totalTests++;
        try {
            const startTime = Date.now();
            const res = await fetch(`${BASE_URL}${url}`, options);
            const duration = Date.now() - startTime;
            
            if (res.ok) {
                const data = await res.json();
                console.log(`✅ [PASS] ${name} (${res.status}) - ${duration}ms`);
                passedTests++;
                return data;
            } else {
                console.log(`❌ [FAIL] ${name} (Status: ${res.status})`);
            }
        } catch (error) {
            console.log(`⚠️ [ERROR] ${name} - Server not running or unreachable: ${error.message}`);
        }
    };

    // 0. Server Health & Environment Check
    await testEndpoint("System Health Check Endpoint", `/health`);

    // 1. Dashboard Stats Verification
    await testEndpoint("Dashboard Metrics & Activity Feed", `/api/dashboard/stats?userId=${USER_ID}`);

    // 2. Courses & Syllabus Roadmaps Verification
    await testEndpoint("Curriculum Roadmaps & Subjects", `/api/courses/all`);

    // 3. Gamification System & Achievements Verification
    await testEndpoint("User Gamified Summary & XP Leaderboards", `/api/gamification/summary?userId=${USER_ID}`);

    // 4. Flashcards & Bookmarks Active Recall Center
    await testEndpoint("Spaced Repetition Study Materials", `/api/study-materials/all?userId=${USER_ID}`);

    // 5. Global Real-Time Search Engine
    await testEndpoint("Unified Instant Search Query", `/api/search?q=Data`);

    // 6. Study Timer Heartbeat & Active Session Telemetry
    await testEndpoint("Study Session Inactivity Heartbeat", `/api/study-sessions/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, addedSeconds: 60, activeInteractions: 5 })
    });

    // 7. Progress Summary
    await testEndpoint("Curriculum Progress Summary", `/api/progress/summary?userId=${USER_ID}`);

    // 8. Analytics Summary
    await testEndpoint("Centralized Analytics & Heatmap Telemetry", `/api/analytics/summary?userId=${USER_ID}`);

    console.log("\n==================================================================");
    console.log(`📊 TEST SUITE SUMMARY: ${passedTests} of ${totalTests} endpoints validated.`);
    console.log("==================================================================");
    
    if (passedTests === totalTests && totalTests > 0) {
        console.log("🎉 ALL AUTOMATED INTEGRATION TESTS PASSED WITH 100% SUCCESS!");
        process.exit(0);
    } else {
        console.log("⚠️ SOME TESTS FAILED OR SERVER WAS UNREACHABLE.");
        process.exit(1);
    }
}

runTestSuite();
