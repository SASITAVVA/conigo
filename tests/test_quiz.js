const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(() => global.fetch(...args));

async function testQuiz() {
    try {
        console.log("Testing Quiz Generation Endpoint...");
        const res = await fetch('http://localhost:3000/api/quiz/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111", topic: "Python Basics", difficulty: "Easy" })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
        if (res.ok) {
            console.log("✅ Quiz endpoint verified successfully!");
        } else {
            console.error("❌ Quiz test failed with status:", res.status);
        }
    } catch(e) {
        console.error("Fetch failed (make sure server is running on port 3000):", e.message);
    }
}
testQuiz();
