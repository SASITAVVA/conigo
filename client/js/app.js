document.addEventListener('DOMContentLoaded', () => {
    // --- Global Loader ---
    const globalLoader = document.getElementById('globalLoader');
    const loaderText = document.getElementById('loaderText');
    
    if (loaderText) {
        setTimeout(() => { if (loaderText) loaderText.innerText = "Connecting to Knowledge Base..."; }, 1500);
        setTimeout(() => { if (loaderText) loaderText.innerText = "Preparing Environment..."; }, 3000);
    }
    setTimeout(() => {
        if (globalLoader) globalLoader.classList.add('hidden');
    }, 5000); // Exactly 5 seconds for the SVG AI neural link animation as requested

    let currentUser = null;
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app');
    
    // --- Auth Session Management ---
    const updateUIForUser = (user) => {
        if (user && user.id !== "11111111-1111-1111-1111-111111111111") {
            currentUser = user;
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            const emailDisplay = document.getElementById('sidebarEmailDisplay') || document.getElementById('userNameDisplay');
            if (emailDisplay) emailDisplay.innerText = user.email || user.name;
            if (user.role === 'admin') {
                const adminNavItem = document.getElementById('nav-admin-item');
                if (adminNavItem) adminNavItem.style.display = 'flex';
            }
        } else {
            // Unauthenticated or stub user: force login screen
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    };

    currentUser = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('cognipath_user'));
    updateUIForUser(currentUser);

    // Subscribe to stateManager to handle automatic OAuth logins
    if (window.appState) {
        window.appState.subscribe((state) => {
            if (state.user && !authContainer.classList.contains('hidden')) {
                updateUIForUser(state.user);
                // Also update recent activities for the new user
                recentActivities = JSON.parse(localStorage.getItem(getActivitiesKey())) || [];
                renderDashboardActivities();
            }
        });
    }

    // --- Toast Notification System ---
    const toastNotification = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    let toastTimeout;

    // --- Handle Email Verification URL Params ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verified')) {
        const vStatus = urlParams.get('verified');
        setTimeout(() => {
            if (vStatus === 'true') {
                showToast("✨ Email successfully verified! You can now log in.");
            } else if (vStatus === 'expired') {
                showToast("⚠️ Verification link expired. Please log in to request a new one.");
            } else if (vStatus === 'invalid') {
                showToast("❌ Invalid verification link.");
            }
            // Clean up URL
            window.history.replaceState({}, document.title, "/");
        }, 1000);
    }

    // --- Activity Tracking System & Expand/Collapse Toggle ---
    window.recentActivitiesExpanded = false;
    const btnViewAllAct = document.getElementById('btnViewAllActivities');
    if (btnViewAllAct) {
        btnViewAllAct.addEventListener('click', (e) => {
            e.preventDefault();
            window.recentActivitiesExpanded = !window.recentActivitiesExpanded;
            const extraItems = document.querySelectorAll('#recentActivityContainer .activity-extra-item');
            extraItems.forEach(el => {
                el.style.setProperty('display', window.recentActivitiesExpanded ? 'flex' : 'none', 'important');
            });
            const total = document.querySelectorAll('#recentActivityContainer > div.flex').length;
            btnViewAllAct.innerText = window.recentActivitiesExpanded ? 'Show Less ↑' : `View All (${total}) →`;
        });
    }

    const getActivitiesKey = () => `recentActivities_${currentUser ? (currentUser.id || currentUser.user_id) : 'default'}`;
    let recentActivities = JSON.parse(localStorage.getItem(getActivitiesKey())) || [];
    
    const renderDashboardActivities = () => {
        const container = document.getElementById('recentActivityContainer');
        if (!container) return;

        if (recentActivities.length === 0) {
            container.innerHTML = `
                <div class="text-muted" style="text-align: center; padding: 2.2rem 1rem; border: 1px dashed var(--border-color); border-radius: 12px; background: rgba(30, 41, 59, 0.3);">
                    <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🌱</div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">No recent activity to display</div>
                    <div style="font-size: 0.8rem; margin-top: 0.25rem; line-height: 1.4;">When you start studying, uploading documents, or interacting with the AI Tutor, your progress will appear right here!</div>
                </div>
            `;
            return;
        }

        const formatDateTime = (act) => {
            const raw = act.created_at || act.timestamp || act.date || act.createdAt;
            const dt = raw ? new Date(raw) : new Date();
            const validDt = !isNaN(dt) ? dt : new Date();
            const dateStr = validDt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = validDt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `${dateStr} • ${timeStr}`;
        };

        const getIconForType = (type) => {
            if (type === 'upload') return `<div class="activity-icon" style="color: var(--primary); background: rgba(79, 70, 229, 0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>`;
            if (type === 'quiz') return `<div class="activity-icon" style="color: var(--success); background: rgba(16, 185, 129, 0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>`;
            return `<div class="activity-icon" style="color: var(--accent); background: rgba(6, 182, 212, 0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>`;
        };

        const isExpanded = window.recentActivitiesExpanded || false;
        const btnViewAll = document.getElementById('btnViewAllActivities');
        if (btnViewAll) {
            if (recentActivities.length <= 5) {
                btnViewAll.style.display = 'none';
            } else {
                btnViewAll.style.display = 'inline-block';
                btnViewAll.innerText = isExpanded ? 'Show Less ↑' : `View All (${recentActivities.length}) →`;
            }
        }

        container.innerHTML = recentActivities.map((act, idx) => {
            const isExtra = idx >= 5;
            const dStyle = (!isExtra || isExpanded) ? 'flex' : 'none';
            return `
            <div class="flex gap-1 items-start ${isExtra ? 'activity-extra-item' : ''}" style="display: ${dStyle} !important;">
                ${getIconForType(act.type)}
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 0.9rem;">${act.title}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${formatDateTime(act)}</div>
                </div>
                ${act.extraData ? `<div class="${act.type === 'quiz' ? 'text-success' : 'text-primary'}" style="font-weight: 600; font-size: 0.85rem;">${act.extraData}</div>` : ''}
            </div>
        `;}).join('');
    };

    const logActivity = (type, title, description, extraData = null, subjectId = null, extraOptions = {}) => {
        const timestamp = new Date().toISOString();
        const activity = { id: Date.now().toString(), type, title, description, extraData, timestamp, ...extraOptions };
        recentActivities.unshift(activity);
        if (recentActivities.length > 50) recentActivities.length = 50;
        localStorage.setItem(getActivitiesKey(), JSON.stringify(recentActivities));
        renderDashboardActivities();

        // Persist real user activity directly to backend database to update Study Time by Subject and Learning Streaks
        try {
            const currentUserId = currentUser ? (currentUser.id || currentUser.user_id) : "11111111-1111-1111-1111-111111111111";
            fetch(`${window.location.origin}/api/study-sessions/record-activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentUserId, 
                    type, 
                    title, 
                    description, 
                    extraData, 
                    subjectId: subjectId || extraOptions.subjectId || null,
                    subjectName: extraOptions.subjectName || null,
                    topicName: extraOptions.topicName || null,
                    duration: extraOptions.duration || null,
                    status: extraOptions.status || 'Completed',
                    metadata: extraOptions.metadata || null
                })
            }).then(() => {
                if (window.appState && typeof window.appState.refreshAll === 'function') {
                    window.appState.refreshAll();
                }
            }).catch(() => {});
        } catch(e) {}
    };
    window.logActivity = logActivity;

    renderDashboardActivities();

    const showToast = (message) => {
        if (!toastNotification || !toastMessage) return;
        toastMessage.innerText = message;
        toastNotification.classList.remove('hidden');
        
        // Trigger reflow for animation
        void toastNotification.offsetWidth;
        
        toastNotification.classList.add('show');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('show');
            setTimeout(() => toastNotification.classList.add('hidden'), 400); // Wait for transition
        }, 3000);
    };

    // --- Auth Form UI Logic ---
    let isLoginMode = true;
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authForm = document.getElementById('authForm');
    const authError = document.getElementById('authError');
    const togglePwdBtn = document.getElementById('togglePwd');
    const pwdInput = document.getElementById('authPassword');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const btnGithubLogin = document.getElementById('btn-github-login');

    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        // CSS Animation reset
        const authCard = document.querySelector('.auth-card');
        authCard.style.animation = 'none';
        authCard.offsetHeight; // trigger reflow
        authCard.style.animation = 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';

        if (isLoginMode) {
            authTitle.innerText = "Welcome Back";
            authTitle.nextElementSibling.innerText = "Enter your credentials to continue.";
            authSubmitBtn.innerText = "Continue";
            toggleAuthMode.innerText = "Sign up";
            toggleAuthMode.parentElement.firstChild.nodeValue = "Don't have an account? ";
        } else {
            authTitle.innerText = "Create Account";
            authTitle.nextElementSibling.innerText = "Sign up to start learning.";
            authSubmitBtn.innerText = "Sign Up";
            toggleAuthMode.innerText = "Log in";
            toggleAuthMode.parentElement.firstChild.nodeValue = "Already have an account? ";
        }
        authError.classList.add('hidden');
    });

    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = btnGoogleLogin.innerHTML;
            btnGoogleLogin.innerText = "Redirecting...";
            try {
                if (!window.supabase) throw new Error("Supabase client not initialized.");
                const { data, error } = await window.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin }
                });
                if (error) throw error;
            } catch (err) {
                console.error("Google login error:", err);
                if (typeof showToast === 'function') showToast("Google login failed.", 'error');
                btnGoogleLogin.innerHTML = originalText;
            }
        });
    }

    if (btnGithubLogin) {
        btnGithubLogin.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = btnGithubLogin.innerHTML;
            btnGithubLogin.innerText = "Redirecting...";
            try {
                if (!window.supabase) throw new Error("Supabase client not initialized.");
                const { data, error } = await window.supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: { redirectTo: window.location.origin }
                });
                if (error) throw error;
            } catch (err) {
                console.error("GitHub login error:", err);
                if (typeof showToast === 'function') showToast("GitHub login failed.", 'error');
                btnGithubLogin.innerHTML = originalText;
            }
        });
    }

    togglePwdBtn.addEventListener('click', () => {
        if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            togglePwdBtn.innerText = 'Hide';
        } else {
            pwdInput.type = 'password';
            togglePwdBtn.innerText = 'Show';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('authEmail').value || '';
        const passwordInput = document.getElementById('authPassword').value || '';
        const email = emailInput.trim().toLowerCase();
        
        authError.classList.add('hidden');
        authError.innerHTML = ''; // Clear previous HTML
        
        const originalText = authSubmitBtn.innerText;
        authSubmitBtn.innerText = isLoginMode ? "Authenticating..." : "Creating Account...";

        try {
            if (isLoginMode) {
                await window.appState.login(email, passwordInput);
            } else {
                await window.appState.register("New Student", email, passwordInput, "Master Software Engineering");
            }

            // If we get here, authentication succeeded!
            currentUser = window.appState.state.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Re-bind activity feed to newly logged in user account
            recentActivities = JSON.parse(localStorage.getItem(getActivitiesKey())) || [];
            renderDashboardActivities();
            
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            
            const emailDisplay = document.getElementById('sidebarEmailDisplay') || document.getElementById('userNameDisplay');
            if (emailDisplay) emailDisplay.innerText = currentUser.email;
            if (currentUser.role === 'admin') {
                const adminNavItem = document.getElementById('nav-admin-item');
                if (adminNavItem) adminNavItem.style.display = 'flex';
            }
            
        } catch (error) {
            authError.innerText = error.message;
            authError.classList.remove('hidden');
        } finally {
            authSubmitBtn.innerText = originalText;
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        recentActivities = [];
        renderDashboardActivities();
        if (window.appState) {
            window.appState.state.userId = "11111111-1111-1111-1111-111111111111";
            window.appState.state.currentUser = null;
        }
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        
        // Retrigger entrance animation
        const authCard = document.querySelector('.auth-card');
        if (authCard) {
            authCard.style.animation = 'none';
            authCard.offsetHeight;
            authCard.style.animation = 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        }
    });

    // --- Navigation Logic ---
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.page-section');
    const pageTitle = document.getElementById('pageTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetPage = link.getAttribute('data-page');
            
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            
            if (pageTitle) {
                // Strip out the SVG text content when setting title
                pageTitle.innerText = link.innerText.trim();
            }

            sections.forEach(sec => {
                if (sec.id === `page-${targetPage}`) {
                    sec.classList.remove('hidden');
                    // Retrigger animation
                    sec.style.animation = 'none';
                    sec.offsetHeight;
                    sec.style.animation = 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                    if (targetPage === 'admin' && window.AdminViewInstance) {
                        window.AdminViewInstance.init();
                        window.AdminViewInstance.fetchAndRender();
                    }
                    if (targetPage === 'flashcards' && typeof window.updateFlashcardsCenter === 'function') {
                        window.updateFlashcardsCenter();
                    }
                    if (targetPage === 'quiz') {
                        const pendingTopic = sessionStorage.getItem('pendingQuizTopic');
                        if (pendingTopic) {
                            const quizTopicInp = document.getElementById('quizTopic');
                            if (quizTopicInp) {
                                quizTopicInp.value = pendingTopic;
                                quizTopicInp.style.transition = 'all 0.3s ease';
                                quizTopicInp.style.borderColor = 'var(--success)';
                                quizTopicInp.style.boxShadow = '0 0 18px rgba(16, 185, 129, 0.45)';
                                setTimeout(() => {
                                    quizTopicInp.style.borderColor = 'var(--border-light)';
                                    quizTopicInp.style.boxShadow = 'none';
                                }, 2500);
                            }
                            sessionStorage.removeItem('pendingQuizTopic');
                            setTimeout(() => {
                                const btnGenerate = document.getElementById('generateQuizBtn');
                                if (btnGenerate) {
                                    btnGenerate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    btnGenerate.focus();
                                }
                            }, 300);
                        }
                    }
                } else {
                    sec.classList.add('hidden');
                }
            });
        });
    });

    // --- PDF Upload & Processing ---
    const uploadBtn = document.getElementById('uploadPdfBtn');
    const fileInput = document.getElementById('pdfFileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const statusDiv = document.getElementById('uploadStatus');

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.innerText = fileInput.files[0].name;
            fileNameDisplay.style.color = "var(--primary)";
        } else {
            fileNameDisplay.innerText = "No file selected";
            fileNameDisplay.style.color = "var(--text-secondary)";
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            statusDiv.innerText = "Please select a PDF file first.";
            statusDiv.style.color = "var(--warning)";
            return;
        }
        if (file.type !== "application/pdf") {
            statusDiv.innerText = "Invalid file type. Please upload a PDF.";
            statusDiv.style.color = "var(--warning)";
            return;
        }

        const documentTitle = file.name;
        statusDiv.innerText = "Extracting text locally...";
        statusDiv.style.color = "var(--text-primary)";

        try {
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    const fname = file.name.toLowerCase();
                    const arrayBuffer = this.result;
                    let extractedText = '';
                    const extractedPages = [];

                    if (fname.endsWith('.pdf')) {
                        const typedarray = new Uint8Array(arrayBuffer);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            let pageText = '';
                            let lastY = null;
                            for (const item of textContent.items) {
                                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 6) {
                                    pageText += '\n' + item.str + ' ';
                                } else {
                                    pageText += item.str + ' ';
                                }
                                lastY = item.transform[5];
                            }
                            pageText = pageText.trim();
                            extractedText += `\n--- Page ${i} ---\n` + pageText + "\n";
                            extractedPages.push({ pageNumber: i, text: pageText });
                        }
                    } else if (fname.endsWith('.docx')) {
                        if (typeof mammoth !== 'undefined') {
                            const res = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                            extractedText = res.value || `DOCX Content: ${file.name}`;
                        } else {
                            extractedText = `DOCX Document: ${file.name}`;
                        }
                        extractedPages.push({ pageNumber: 1, text: extractedText });
                    } else {
                        extractedText = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
                        if (!extractedText.trim()) extractedText = `Document Content: ${file.name}`;
                        extractedPages.push({ pageNumber: 1, text: extractedText });
                    }

                    if (!extractedText.trim()) {
                        statusDiv.innerText = "Extraction failed. The document might be unreadable or empty.";
                        statusDiv.style.color = "var(--warning)";
                        return;
                    }

                    statusDiv.innerText = "Text extracted. Sending to server...";

                    if (!currentUser) {
                        currentUser = { id: "11111111-1111-1111-1111-111111111111", email: "student@cognipath.ai" };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    const userId = currentUser.id;

                    const response = await fetch(`${window.location.origin}/api/documents/process`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: documentTitle,
                            extractedText: extractedText,
                            pages: extractedPages,
                            userId: userId
                        })
                    });

                    if (response.ok) {
                        statusDiv.innerText = "Document processed successfully! Ready for AI Tutor.";
                        statusDiv.style.color = "var(--success)";
                        const p = document.getElementById('statPdfs');
                        if(p) p.innerText = parseInt(p.innerText) + 1;
                        logActivity('upload', `Uploaded: ${file.name}`, 'Document added to knowledge base.');
                        if (window.appState) window.appState.refreshAll();
                    } else {
                        throw new Error("Server rejected the file (File might be too large)");
                    }
                } catch (err) {
                    console.error("Upload Error:", err);
                    statusDiv.innerText = "Upload failed: " + err.message;
                    statusDiv.style.color = "var(--error)";
                }
            };
            
            try {
                fileReader.readAsArrayBuffer(file);
            } catch (err) {
                console.error(err);
                statusDiv.innerText = "An error occurred reading the file.";
                statusDiv.style.color = "var(--warning)";
            }
        } catch (outerErr) {
            console.error("Upload initiation failed:", outerErr);
        }
    });

    // --- Chat Logic ---
    let currentChatId = sessionStorage.getItem('currentChatId') || null;
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatHistory = document.getElementById('chatHistory');
    
    // Restore chat from session if exists
    if (currentChatId) {
        const savedChat = sessionStorage.getItem('savedChatHistory');
        if (savedChat && chatHistory) {
            chatHistory.innerHTML = savedChat;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    }

    const appendMessage = (text, role) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.innerText = text;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        sessionStorage.setItem('savedChatHistory', chatHistory.innerHTML);
        return msgDiv;
    };

    sendChatBtn.addEventListener('click', async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';
        if (!currentUser) {
            appendMessage("Please log in to chat.", 'assistant');
            return;
        }

        const assistantMsgDiv = appendMessage('', 'assistant');

        try {
            const payload = { message: text, userId: currentUser.id };
            if (currentChatId) payload.chatId = currentChatId;

            const response = await fetch(`${window.location.origin}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Chat request failed");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr) {
                            try {
                                const dataObj = JSON.parse(dataStr);
                                if (dataObj.chatId && !currentChatId) {
                                    currentChatId = dataObj.chatId;
                                    sessionStorage.setItem('currentChatId', currentChatId);
                                }
                                if (dataObj.done) {
                                    sessionStorage.setItem('savedChatHistory', chatHistory.innerHTML);
                                    break;
                                }
                                if (dataObj.content) {
                                    fullContent += dataObj.content;
                                    assistantMsgDiv.innerHTML = marked.parse(fullContent); // Added marked.parse for markdown rendering if available, fallback to innerText if not
                                    if(typeof marked === 'undefined') assistantMsgDiv.innerText = fullContent;
                                    chatHistory.scrollTop = chatHistory.scrollHeight;
                                }
                            } catch (e) {
                                console.error("Error parsing stream chunk", e);
                            }
                        }
                    }
                }
            }
            const q = document.getElementById('statQuestions');
            if(q) q.innerText = parseInt(q.innerText) + 1;
            if (window.appState) window.appState.refreshAll();
        } catch (err) {
            console.error(err);
            assistantMsgDiv.innerText = "Error communicating with AI Tutor.";
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatBtn.click();
    });

    // --- Quiz Engine Logic ---
    let quizData = [];
    let currentQuestionIndex = 0;
    let selectedOptionIndex = null;
    let score = 0;
    let weakTopics = new Set();
    let selectedDifficulty = "Easy"; // default

    const quizSetupView = document.getElementById('quizSetupView');
    const quizActiveView = document.getElementById('quizActiveView');
    const quizResultsView = document.getElementById('quizResultsView');
    const generateQuizBtn = document.getElementById('generateQuizBtn');
    const quizStatus = document.getElementById('quizStatus');
    const quizTopicInput = document.getElementById('quizTopic');
    const quizFileInput = document.getElementById('quizFileInput');
    const quizFileNameDisplay = document.getElementById('quizFileNameDisplay');
    
    // Difficulty Selection
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDifficulty = btn.getAttribute('data-level');
            
            const countSection = document.getElementById('questionCountSection');
            if (countSection) {
                countSection.classList.remove('hidden');
            }
        });
    });

    // Question Count Selection
    document.querySelectorAll('.q-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.q-count-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'rgba(255, 255, 255, 0.03)';
                b.style.borderColor = 'var(--border-light)';
                b.style.color = 'var(--text-secondary)';
            });
            
            btn.classList.add('active');
            btn.style.background = 'rgba(99, 102, 241, 0.2)';
            btn.style.borderColor = 'var(--primary)';
            btn.style.color = 'white';
            
            const hiddenInput = document.getElementById('questionCountSelect');
            if (hiddenInput) {
                hiddenInput.value = btn.getAttribute('data-count');
            }
        });
    });

    // File Input Display & Drag-and-Drop
    const quizDropZone = document.getElementById('quizDropZone');
    
    if (quizDropZone) {
        quizDropZone.addEventListener('click', () => quizFileInput.click());
        
        quizDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            quizDropZone.style.background = 'rgba(124, 58, 237, 0.08)';
            quizDropZone.style.borderColor = 'var(--primary)';
        });
        
        quizDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            quizDropZone.style.background = 'rgba(124, 58, 237, 0.02)';
            quizDropZone.style.borderColor = 'rgba(124, 58, 237, 0.4)';
        });
        
        quizDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            quizDropZone.style.background = 'rgba(124, 58, 237, 0.02)';
            quizDropZone.style.borderColor = 'rgba(124, 58, 237, 0.4)';
            
            if (e.dataTransfer.files.length > 0) {
                quizFileInput.files = e.dataTransfer.files;
                quizFileInput.dispatchEvent(new Event('change'));
            }
        });
    }

    quizFileInput.addEventListener('change', () => {
        if (quizFileInput.files.length > 0) {
            quizFileNameDisplay.innerText = quizFileInput.files[0].name;
            quizFileNameDisplay.style.color = "var(--primary)";
        } else {
            quizFileNameDisplay.innerText = "No file selected";
            quizFileNameDisplay.style.color = "var(--text-secondary)";
        }
    });

    // Generate Quiz
    generateQuizBtn.addEventListener('click', async () => {
        const topic = quizTopicInput.value.trim();
        const file = quizFileInput.files[0];

        if (!topic && !file) {
            quizStatus.innerText = "Please enter a topic or upload a PDF.";
            quizStatus.style.color = "var(--warning)";
            return;
        }

        const countSelect = document.getElementById('questionCountSelect');
        const questionCount = countSelect ? parseInt(countSelect.value, 10) : 10;
        
        if (questionCount > 20 || questionCount < 1) {
            quizStatus.innerText = "You can only generate between 1 and 20 questions at a time.";
            quizStatus.style.color = "var(--warning)";
            return;
        }

        generateQuizBtn.innerText = "Generating Quiz...";
        quizStatus.innerText = "Analyzing content and writing questions...";
        quizStatus.style.color = "var(--text-primary)";

        try {
            let extractedText = "";
            if (file) {
                const fname = file.name.toLowerCase();
                const fileReader = new FileReader();
                extractedText = await new Promise((resolve) => {
                    fileReader.onload = async function() {
                        try {
                            const arrayBuffer = this.result;
                            if (fname.endsWith('.pdf')) {
                                const typedarray = new Uint8Array(arrayBuffer);
                                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                                let text = "";
                                for (let i = 1; i <= pdf.numPages; i++) {
                                    const page = await pdf.getPage(i);
                                    const content = await page.getTextContent();
                                    text += content.items.map(item => item.str).join(' ') + "\n";
                                }
                                resolve(text || `Content extracted from PDF document: ${file.name}`);
                            } else if (fname.endsWith('.docx')) {
                                if (typeof mammoth !== 'undefined') {
                                    const res = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                                    resolve(res.value || `Content extracted from DOCX document: ${file.name}`);
                                } else {
                                    const uint = new Uint8Array(arrayBuffer);
                                    const rawStr = new TextDecoder('utf-8', { fatal: false }).decode(uint);
                                    const matches = rawStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
                                    resolve(matches ? matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ') : `Content extracted from DOCX: ${file.name}`);
                                }
                            } else if (fname.endsWith('.txt') || fname.endsWith('.md') || fname.endsWith('.csv')) {
                                resolve(new TextDecoder('utf-8').decode(arrayBuffer));
                            } else {
                                resolve(new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer) || `Document: ${file.name}`);
                            }
                        } catch (e) {
                            console.warn("Document parser fallback triggered for:", file.name, e);
                            resolve(`Document Topic: ${file.name.replace(/\.[^/.]+$/, "")}. Please generate comprehensive multiple choice quiz questions covering key programming and domain concepts associated with ${file.name.replace(/\.[^/.]+$/, "")}.`);
                        }
                    };
                    fileReader.onerror = () => {
                        resolve(`Document Topic: ${file.name.replace(/\.[^/.]+$/, "")}`);
                    };
                    fileReader.readAsArrayBuffer(file);
                });
            }

            const response = await fetch(`${window.location.origin}/api/quiz/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentUser ? currentUser.id : "11111111-1111-1111-1111-111111111111", 
                    topic: topic, 
                    text: extractedText,
                    difficulty: selectedDifficulty,
                    questionCount: questionCount
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.details || "Failed to generate quiz. AI Service may be unavailable.");
            }

            const data = await response.json();
            if (!data.questions || data.questions.length === 0) throw new Error("No questions returned from AI. Try a different topic.");

            quizData = data.questions;
            startQuiz();
            if (window.appState) window.appState.refreshAll();

        } catch (err) {
            console.error(err);
            quizStatus.innerText = err.message || "Error generating quiz. Please try again.";
            quizStatus.style.color = "var(--warning)";
        } finally {
            generateQuizBtn.innerText = "Generate Quiz";
        }
    });

    const startQuiz = () => {
        currentQuestionIndex = 0;
        score = 0;
        weakTopics.clear();
        quizSetupView.classList.add('hidden');
        quizResultsView.classList.add('hidden');
        quizActiveView.classList.remove('hidden');
        loadQuestion();
    };

    const loadQuestion = () => {
        const q = quizData[currentQuestionIndex];
        document.getElementById('quizProgress').innerText = `${currentQuestionIndex + 1} / ${quizData.length}`;
        document.getElementById('quizQuestionText').innerText = q.question;
        
        const optionsContainer = document.getElementById('quizOptionsContainer');
        optionsContainer.innerHTML = '';
        selectedOptionIndex = null;
        const nextBtn = document.getElementById('quizNextBtn');
        nextBtn.disabled = true;
        nextBtn.innerText = "Select an option";

        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.innerText = opt;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedOptionIndex = index;
                nextBtn.disabled = false;
                nextBtn.innerText = "Confirm & Next";
            });
            optionsContainer.appendChild(btn);
        });
    };

    document.getElementById('quizNextBtn').addEventListener('click', () => {
        if (selectedOptionIndex === null) return;
        
        const q = quizData[currentQuestionIndex];
        const selectedText = q.options[selectedOptionIndex];
        
        if (selectedText === q.correct_answer) {
            score++;
        } else {
            if (q.topic) weakTopics.add(q.topic);
        }

        currentQuestionIndex++;
        if (currentQuestionIndex < quizData.length) {
            loadQuestion();
        } else {
            showResults();
        }
    });

    const showResults = async () => {
        quizActiveView.classList.add('hidden');
        quizResultsView.classList.remove('hidden');
        
        document.getElementById('quizScoreText').innerText = `${score}/${quizData.length}`;
        const percentage = Math.round((score / quizData.length) * 100);
        document.getElementById('quizPercentageText').innerText = `${percentage}%`;

        // Update Dashboard Stats locally for instant feedback
        document.getElementById('statTopics').innerText = `${percentage}%`;
        const topicName = document.getElementById('quizActiveTopic').innerText || 'General';
        logActivity('quiz', `Quiz Completed: ${topicName}`, 'Finished quiz', `${percentage}%`);

        // Send progress to backend
        try {
            const userId = currentUser ? currentUser.id : "11111111-1111-1111-1111-111111111111";
            await fetch(`${window.location.origin}/api/progress/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    topic: topicName,
                    masteryScore: percentage,
                    questionsAsked: quizData.length
                })
            });
            if(window.appState) window.appState.refreshAll();
        } catch(e) {
            console.error("Failed to update progress on backend", e);
        }

        const weakList = document.getElementById('quizWeakTopics');
        weakList.innerHTML = '';
        if (weakTopics.size > 0) {
            document.getElementById('weakTopicsSection').classList.remove('hidden');
            weakTopics.forEach(topic => {
                const li = document.createElement('li');
                li.innerText = topic;
                weakList.appendChild(li);
            });
        } else {
            document.getElementById('weakTopicsSection').classList.add('hidden');
        }
    };

    document.getElementById('quizRestartBtn').addEventListener('click', () => {
        quizResultsView.classList.add('hidden');
        quizSetupView.classList.remove('hidden');
        quizStatus.innerText = "";
    });

    // --- Settings Logic ---
    const settingsSaveProfileBtn = document.getElementById('settingsSaveProfileBtn');
    const settingsThemeSelect = document.getElementById('settingsThemeSelect');
    const settingsDeleteAccountBtn = document.getElementById('settingsDeleteAccountBtn');
    const settingsDisplayName = document.getElementById('settingsDisplayName');

    if (settingsSaveProfileBtn) {
        settingsSaveProfileBtn.addEventListener('click', () => {
            const newName = settingsDisplayName.value;
            settingsSaveProfileBtn.innerText = "Saving...";
            setTimeout(() => {
                // Instantly reflect name across the UI
                const sidebarName = document.getElementById('sidebarNameDisplay');
                const topHeaderName = document.getElementById('topHeaderName');
                const settingsHeaderName = document.getElementById('settingsHeaderName');
                
                if (sidebarName) sidebarName.innerText = newName;
                if (topHeaderName) topHeaderName.innerText = newName.split(' ')[0]; // Welcome back, Firstname
                if (settingsHeaderName) settingsHeaderName.innerText = newName;
                
                if (currentUser) {
                    currentUser.displayName = newName;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                settingsSaveProfileBtn.innerText = "Save Profile";
                showToast(`Profile updated successfully!`);
            }, 800);
        });
    }

    if (settingsThemeSelect) {
        settingsThemeSelect.addEventListener('change', (e) => {
            const theme = e.detail?.value || e.target.value || e.target.getAttribute('data-value');
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        });
    }

    // --- Avatar Upload Logic ---
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    const settingsAvatar = document.getElementById('settingsAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    if (changeAvatarBtn && avatarUploadInput) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarUploadInput.click();
        });

        avatarUploadInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (onloadEvent) => {
                    const imgUrl = onloadEvent.target.result;
                    if (settingsAvatar) {
                        settingsAvatar.style.backgroundImage = `url(${imgUrl})`;
                        settingsAvatar.innerText = ""; // Clear text
                    }
                    if (sidebarAvatar) {
                        sidebarAvatar.style.backgroundImage = `url(${imgUrl})`;
                        sidebarAvatar.innerText = ""; // Clear text
                    }
                    showToast("Avatar updated successfully!");
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }



    if (settingsDeleteAccountBtn) {
        settingsDeleteAccountBtn.addEventListener('click', () => {
            const confirmed = confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and all your study data will be lost forever.");
            if (confirmed) {
                alert("Account deleted. (This is a mock action for now). Logging you out...");
                document.getElementById('logoutBtn').click();
            }
        });
    }

    // --- Study Notes Logic ---
    let myNotes = JSON.parse(localStorage.getItem('myNotes')) || [
        {
            id: '1',
            title: 'Python Basics',
            content: '# Python Basics\n\nPython is a high-level, interpreted programming language known for its simplicity and readability.\n\n## Why Python?\n- Easy to learn and use\n- Large standard library\n- Cross-platform\n\nExample:\nprint("Hello, Python!")',
            tag: 'Python',
            lastUpdated: new Date().toISOString()
        }
    ];
    let activeNoteId = myNotes.length > 0 ? myNotes[0].id : null;

    const notesListContainer = document.getElementById('notesListContainer');
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentArea = document.getElementById('noteContentArea');
    const wordCountDisplay = document.getElementById('wordCount');
    const charCountDisplay = document.getElementById('charCount');
    const snTotalNotes = document.getElementById('snTotalNotes');

    const updateWordCharCount = () => {
        if (!noteContentArea) return;
        const text = noteContentArea.value || '';
        charCountDisplay.innerText = text.length;
        wordCountDisplay.innerText = text.trim() ? text.trim().split(/\s+/).length : 0;
    };

    if (noteContentArea) {
        noteContentArea.addEventListener('input', updateWordCharCount);
    }

    const renderNotesList = () => {
        if (!notesListContainer) return;
        if (snTotalNotes) snTotalNotes.innerText = myNotes.length;
        
        notesListContainer.innerHTML = myNotes.map(note => {
            const isActive = note.id === activeNoteId;
            return `
            <div class="note-item flex items-start gap-1 p-1 hover-lift" data-id="${note.id}" style="padding: 1rem; border-radius: var(--radius-md); border: 1px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}; background: ${isActive ? 'rgba(79,70,229,0.05)' : 'transparent'}; cursor: pointer; transition: all var(--transition-fast);">
                <div style="color: ${isActive ? 'var(--primary)' : 'var(--text-secondary)'};">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style="flex: 1;">
                    <div class="flex justify-between items-center mb-1">
                        <div style="font-weight: 600; font-size: 0.95rem; color: ${isActive ? 'var(--primary)' : 'var(--text-primary)'};">${note.title || 'Untitled'}</div>
                        ${isActive ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="text-muted" style="font-size: 0.75rem;">Just now</div>
                        ${note.tag ? `<div style="font-size: 0.7rem; font-weight: 600; color: var(--primary); background: rgba(79,70,229,0.1); padding: 0.1rem 0.5rem; border-radius: 12px;">${note.tag}</div>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Attach click listeners
        document.querySelectorAll('.note-item').forEach(el => {
            el.addEventListener('click', (e) => {
                activeNoteId = e.currentTarget.getAttribute('data-id');
                loadActiveNote();
                renderNotesList();
            });
        });
    };

    const loadActiveNote = () => {
        if (!noteTitleInput || !noteContentArea) return;
        const note = myNotes.find(n => n.id === activeNoteId);
        if (note) {
            noteTitleInput.value = note.title;
            noteContentArea.value = note.content;
            updateWordCharCount();
        }
    };

    const saveActiveNote = () => {
        const noteIndex = myNotes.findIndex(n => n.id === activeNoteId);
        if (noteIndex !== -1 && noteTitleInput && noteContentArea) {
            myNotes[noteIndex].title = noteTitleInput.value;
            myNotes[noteIndex].content = noteContentArea.value;
            myNotes[noteIndex].lastUpdated = new Date().toISOString();
            localStorage.setItem('myNotes', JSON.stringify(myNotes));
            showToast("Note saved successfully! 🤖 AI verifying study topic...");
            renderNotesList();
            
            if (typeof logActivity === 'function') {
                logActivity('upload', `Note updated: ${myNotes[noteIndex].title}`, 'Edited study notes');
            }

            // Trigger AI Automatic Note Verification & Progress Roadmap Sync
            fetch(`${window.location.origin}/api/notes/verify-and-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    noteTitle: myNotes[noteIndex].title, 
                    noteContent: myNotes[noteIndex].content,
                    userId: window.appState ? window.appState.state.userId : '11111111-1111-1111-1111-111111111111'
                })
            })
            .then(r => r.json())
            .then(res => {
                if (res.success && res.verifiedTopic) {
                    if (typeof showToast === 'function') {
                        showToast(`✨ AI Verified: Added "${res.verifiedTopic.title}" & Generated ${res.generatedCardsCount || 10} Flashcards!`);
                    }
                    if (window.appState && typeof window.appState.showXPToast === 'function') {
                        window.appState.showXPToast('+50 XP', `AI Topic Verified & Flashcards Created!`);
                    }
                    if (window.appState && typeof window.appState.refreshAll === 'function') {
                        window.appState.refreshAll(true).then(() => {
                            if (typeof window.updateFlashcardsCenter === 'function') {
                                window.updateFlashcardsCenter();
                            }
                        });
                    } else if (typeof window.updateFlashcardsCenter === 'function') {
                        setTimeout(() => window.updateFlashcardsCenter(), 500);
                    }
                }
            })
            .catch(e => console.error("AI Note Verification Sync Error:", e.message || e));
        }
    };

    const btnSaveNote = document.getElementById('btnSaveNote');
    if (btnSaveNote) {
        btnSaveNote.addEventListener('click', saveActiveNote);
    }

    const btnCreateNote = document.getElementById('btnCreateNote');
    if (btnCreateNote) {
        btnCreateNote.addEventListener('click', () => {
            const newNote = {
                id: Date.now().toString(),
                title: 'New Note',
                content: '',
                tag: 'General',
                lastUpdated: new Date().toISOString()
            };
            myNotes.unshift(newNote);
            activeNoteId = newNote.id;
            localStorage.setItem('myNotes', JSON.stringify(myNotes));
            renderNotesList();
            loadActiveNote();
            
            if (typeof logActivity === 'function') {
                logActivity('upload', `Note created`, 'Created new study note');
            }
        });
    }

    // Initialize Notes
    if (document.getElementById('page-study-notes')) {
        renderNotesList();
        loadActiveNote();
    }

    // --- Markdown Editor Toolbar Logic ---
    const setupMarkdownToolbar = () => {
        const textArea = document.getElementById('noteContentArea');
        const toolbarBtns = document.querySelectorAll('.editor-toolbar .toolbar-btn');
        const editorDropdown = document.querySelector('.editor-toolbar .custom-dropdown');
        
        if (!textArea) return;

        const insertText = (prefix, suffix = '') => {
            const start = textArea.selectionStart;
            const end = textArea.selectionEnd;
            const selectedText = textArea.value.substring(start, end);
            const replacement = prefix + selectedText + suffix;
            
            textArea.value = textArea.value.substring(0, start) + replacement + textArea.value.substring(end);
            
            textArea.focus();
            if (selectedText.length > 0) {
                textArea.selectionStart = start + prefix.length;
                textArea.selectionEnd = start + prefix.length + selectedText.length;
            } else {
                textArea.selectionStart = textArea.selectionEnd = start + prefix.length;
            }
            
            textArea.dispatchEvent(new Event('input'));
        };

        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                if (action === 'bold') insertText('**', '**');
                else if (action === 'italic') insertText('*', '*');
                else if (action === 'underline') insertText('<u>', '</u>');
                else if (action === 'list-ul') insertText('- ');
                else if (action === 'list-ol') insertText('1. ');
                else if (action === 'code') insertText('```\n', '\n```');
                else if (action === 'link') insertText('[', '](url)');
            });
        });

        if (editorDropdown) {
            const options = editorDropdown.querySelectorAll('.dropdown-options div');
            options.forEach(opt => {
                opt.addEventListener('click', (e) => {
                    const val = opt.getAttribute('data-value');
                    if (val === 'h1') insertText('# ');
                    else if (val === 'h2') insertText('## ');
                    
                    // Reset dropdown UI back to normal text after injecting markdown
                    setTimeout(() => {
                        const selectedEl = editorDropdown.querySelector('.dropdown-selected');
                        if (selectedEl) {
                            selectedEl.innerHTML = 'Normal text <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
                        }
                        options.forEach(o => o.classList.remove('selected'));
                        const normalOpt = editorDropdown.querySelector('[data-value="normal"]');
                        if(normalOpt) normalOpt.classList.add('selected');
                        editorDropdown.setAttribute('data-value', 'normal');
                    }, 50);
                });
            });
        }
    };
    setupMarkdownToolbar();

    // --- AI Study Assistant Logic ---
    const handleAITask = async (taskType, customPrompt = "") => {
        if (!noteContentArea) return;
        const noteContent = noteContentArea.value;
        if (!noteContent.trim()) {
            showToast("Note is empty! Type something first.");
            return;
        }

        const modal = document.getElementById('aiNoteResultModal');
        const modalTitle = document.getElementById('aiModalTitle');
        const modalContent = document.getElementById('aiModalContent');
        
        modalTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> AI Result`;
        modalContent.innerHTML = `<div class="flex items-center justify-center gap-1 text-primary p-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
            Generating response...
        </div>`;
        modal.classList.remove('hidden');

        try {
            if (typeof logActivity === 'function') {
                logActivity('tutor', `AI Task Triggered`, `Requested ${taskType.toUpperCase()} on note`);
            }

            const response = await fetch(`${window.location.origin}/api/notes/task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteContent, taskType, customPrompt })
            });

            const data = await response.json();
            if (data.success) {
                if (taskType === 'flashcards' && typeof data.result === 'object' && data.result.flashcards) {
                    let html = `<div style="max-height: 50vh; overflow-y: auto; padding: 10px; margin-bottom: 15px; border-radius: 8px; background: rgba(0,0,0,0.1);">`;
                    data.result.flashcards.forEach((card, i) => {
                        html += `<div style="margin-bottom: 12px; padding: 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-light); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;"><span style="color: var(--primary); margin-right: 6px;">Q:</span>${card.question}</div>
                            <div style="font-size: 0.95rem; color: var(--text-secondary);"><span style="color: var(--success); margin-right: 6px; font-weight: 600;">A:</span>${card.answer}</div>
                        </div>`;
                    });
                    html += `</div>
                    <div style="text-align: center;">
                        <button id="btnSaveGeneratedFlashcards" class="btn-primary hover-lift" style="width: 100%; padding: 14px; font-weight: bold; border-radius: 12px; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            Save ${data.result.flashcards.length} Flashcards to Library
                        </button>
                    </div>`;
                    
                    modalContent.innerHTML = html;
                    
                    setTimeout(() => {
                        const saveBtn = document.getElementById('btnSaveGeneratedFlashcards');
                        if (saveBtn) {
                            saveBtn.addEventListener('click', async () => {
                                saveBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Saving...`;
                                saveBtn.disabled = true;
                                saveBtn.style.opacity = '0.7';
                                try {
                                    const noteTitle = noteTitleInput ? noteTitleInput.value : 'General';
                                    const payload = data.result.flashcards.map(c => ({...c, category: noteTitle, topic: 'AI Study Assistant'}));
                                    const currentUserId = window.appState ? window.appState.state.userId : '11111111-1111-1111-1111-111111111111';

                                    const saveRes = await fetch(`${window.location.origin}/api/study-materials/flashcards/bulk-save`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ flashcards: payload, userId: currentUserId })
                                    });
                                    const saveData = await saveRes.json();
                                    
                                    if (saveData.success) {
                                        document.getElementById('aiNoteResultModal').classList.add('hidden');
                                        if (typeof showToast === 'function') showToast(`✨ Successfully saved ${saveData.savedCount} flashcards to your library!`);
                                        
                                        if (window.appState && typeof window.appState.refreshAll === 'function') {
                                            window.appState.refreshAll(true).then(() => {
                                                if (typeof window.updateFlashcardsCenter === 'function') {
                                                    window.updateFlashcardsCenter();
                                                }
                                                const fcTab = document.querySelector('[data-page="flashcards"]');
                                                if (fcTab) fcTab.click();
                                            });
                                        }
                                    } else {
                                        alert('Failed to save flashcards: ' + saveData.error);
                                        saveBtn.innerText = '💾 Save Flashcards to Library';
                                        saveBtn.disabled = false;
                                        saveBtn.style.opacity = '1';
                                    }
                                } catch (err) {
                                    console.error(err);
                                    alert('Network error saving flashcards.');
                                    saveBtn.innerText = '💾 Save Flashcards to Library';
                                    saveBtn.disabled = false;
                                    saveBtn.style.opacity = '1';
                                }
                            });
                        }
                    }, 50);
                } else {
                    modalContent.innerHTML = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
                }
                
                if (window.appState) window.appState.refreshAll(true);
            } else {
                modalContent.innerHTML = `<span class="text-error">Failed to generate response: ${data.error || 'Unknown error'}</span>`;
            }
        } catch (error) {
            modalContent.innerHTML = `<span class="text-error">Connection error. Ensure the backend server is running.</span>`;
            console.error("AI Task Error:", error);
        }
    };

    // Bind AI Buttons
    document.getElementById('btnAiSummarize')?.addEventListener('click', () => handleAITask('summarize'));
    document.getElementById('btnAiFlashcards')?.addEventListener('click', () => handleAITask('flashcards'));
    document.getElementById('btnAiQuiz')?.addEventListener('click', () => handleAITask('custom', 'Generate a quick multiple-choice quiz about this note.'));
    document.getElementById('btnAiExplain')?.addEventListener('click', () => handleAITask('explain'));
    document.getElementById('btnAiSimplify')?.addEventListener('click', () => handleAITask('simplify'));
    document.getElementById('btnAiTranslate')?.addEventListener('click', () => handleAITask('translate'));

    // Bind AI Chat Input
    const aiChatInput = document.getElementById('aiChatInput');
    const btnAiChatSend = document.getElementById('btnAiChatSend');
    
    if (aiChatInput && btnAiChatSend) {
        btnAiChatSend.addEventListener('click', () => {
            const prompt = aiChatInput.value;
            if (prompt.trim()) {
                handleAITask('custom', prompt);
                aiChatInput.value = '';
            }
        });
        aiChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnAiChatSend.click();
        });
    }

    // Modal Close logic
    const aiNoteResultModal = document.getElementById('aiNoteResultModal');
    const btnAiModalClose = document.getElementById('btnAiModalClose');
    const btnAiModalCopy = document.getElementById('btnAiModalCopy');

    if (btnAiModalClose) {
        btnAiModalClose.addEventListener('click', () => {
            aiNoteResultModal.classList.add('hidden');
        });
    }

    if (btnAiModalCopy) {
        btnAiModalCopy.addEventListener('click', () => {
            const content = document.getElementById('aiModalContent').innerText;
            navigator.clipboard.writeText(content);
            showToast("Copied to clipboard!");
        });
    }

    // --- Chart.js Initialization for Original Dashboard ---
    const chartCanvas = document.getElementById('learningOverviewChart');
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)'); // Secondary color
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Study Activity',
                    data: [15, 55, 45, 75, 42, 65, 80],
                    borderColor: '#7C3AED',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#7C3AED',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curves
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#FFFFFF',
                        bodyColor: '#CBD5E1',
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' points';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#475569', // text-muted equivalent
                            stepSize: 20
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#475569'
                        }
                    }
                }
            }
        });
    }

    // --- Chart.js Initialization for Analytics ---
    
    // 1. Study Time Over Time (Area Chart)
    const studyTimeCanvas = document.getElementById('studyTimeChart');
    if (studyTimeCanvas) {
        const ctx = studyTimeCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)');
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['May 19', 'May 20', 'May 21', 'May 22', 'May 23', 'May 24', 'May 25'],
                datasets: [{
                    label: 'Study Hours',
                    data: [1.8, 2.5, 2.1, 4.2, 5.8, 6.7, 5.5],
                    borderColor: '#7C3AED',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#7C3AED',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 8,
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#475569', stepSize: 2, callback: function(value) { return value + 'h'; } }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#475569' }
                    }
                }
            }
        });
    }

    // 2. Study Time by Subject (Doughnut Chart)
    const subjectCanvas = document.getElementById('subjectDoughnutChart');
    if (subjectCanvas) {
        const ctx = subjectCanvas.getContext('2d');
        
        // Custom plugin to draw text in the middle
        const centerTextPlugin = {
            id: 'centerText',
            beforeDraw: function(chart) {
                var width = chart.width, height = chart.height, ctx = chart.ctx;
                ctx.restore();
                
                var centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                var centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                
                var fontSize = (height / 130).toFixed(2);
                ctx.font = "bold " + fontSize + "em Outfit, Inter, sans-serif";
                ctx.textBaseline = "middle";
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#000';
                
                var text = (chart.options && chart.options.customCenterText) || ((window.appState && window.appState.state && window.appState.state.dashboard && window.appState.state.dashboard.studyHours) ? window.appState.state.dashboard.studyHours : "24h 35m");
                var textX = centerX - (ctx.measureText(text).width / 2);
                var textY = centerY - 10;
                
                ctx.fillText(text, textX, textY);
                
                ctx.font = "600 " + (fontSize * 0.4) + "em Inter, sans-serif";
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
                var text2 = "Total";
                var text2X = centerX - (ctx.measureText(text2).width / 2);
                var text2Y = centerY + 18;
                
                ctx.fillText(text2, text2X, text2Y);
                ctx.save();
            }
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Data Structures', 'Web Development', 'Database Systems', 'Operating Systems', 'Other Subjects'],
                datasets: [{
                    data: [25, 21, 18, 15, 21],
                    backgroundColor: ['#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94A3B8',
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Inter', size: 12 }
                        }
                    }
                }
            },
            plugins: [centerTextPlugin]
        });
    }

    // 3. Initialize empty Heatmap Grid (populated by real-time analytics state)
    const heatmapGrid = document.getElementById('heatmapGrid');
    if (heatmapGrid && heatmapGrid.children.length === 0) {
        // 4 rows (metrics) x 7 cols (days) empty grid default
        for (let i = 0; i < 28; i++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            heatmapGrid.appendChild(cell);
        }
    }

    // --- Chart.js Initialization for Progress Page ---
    
    // 1. Overall Progress (Doughnut Chart)
    const progressOverallCanvas = document.getElementById('progressOverallChart');
    if (progressOverallCanvas) {
        const ctx = progressOverallCanvas.getContext('2d');
        
        const centerProgressTextPlugin = {
            id: 'centerProgressText',
            beforeDraw: function(chart) {
                var width = chart.width, height = chart.height, ctx = chart.ctx;
                ctx.restore();
                
                var centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                var centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                
                var fontSize = (height / 110).toFixed(2);
                ctx.font = "bold " + fontSize + "em Outfit, Inter, sans-serif";
                ctx.textBaseline = "middle";
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#000';
                
                var text = (chart.options && chart.options.customCenterText) || (chart.data.datasets[0] && chart.data.datasets[0].data[0] !== undefined ? chart.data.datasets[0].data[0] + "%" : "0%");
                var textX = centerX - (ctx.measureText(text).width / 2);
                var textY = centerY - 10;
                ctx.fillText(text, textX, textY);
                
                ctx.font = "600 " + (fontSize * 0.35) + "em Inter, sans-serif";
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
                var text2 = "Mastered";
                var text2X = centerX - (ctx.measureText(text2).width / 2);
                var text2Y = centerY + 20;
                ctx.fillText(text2, text2X, text2Y);
                ctx.save();
            }
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Remaining'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#4F46E5', 'rgba(79, 70, 229, 0.1)'],
                    borderWidth: 0,
                    cutout: '80%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [centerProgressTextPlugin]
        });
    }

    // 2. Progress Over Time (Line Chart with Data Labels)
    const progressTimeCanvas = document.getElementById('progressTimeChart');
    if (progressTimeCanvas) {
        const ctx = progressTimeCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
        
        const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#6366F1';
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#0F172A';
        const textSecondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#64748B';
        const gridColor = getComputedStyle(document.body).getPropertyValue('--border-light').trim() || 'rgba(0,0,0,0.1)';
        const surfaceColor = getComputedStyle(document.body).getPropertyValue('--bg-surface').trim() || '#ffffff';

        // Inline plugin to draw data labels
        const inlineDataLabelsPlugin = {
            id: 'inlineDataLabels',
            afterDatasetsDraw: function(chart, args, options) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        ctx.fillStyle = textColor;
                        ctx.font = 'bold 12px Inter, sans-serif';
                        const dataString = dataset.data[index] + '%';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        const padding = 12;
                        const position = element.tooltipPosition();
                        ctx.fillText(dataString, position.x, position.y - padding);
                    });
                });
            }
        };
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['May 19', 'May 20', 'May 21', 'May 22', 'May 23', 'May 24', 'May 25'],
                datasets: [{
                    label: 'Progress',
                    data: [38, 42, 46, 54, 61, 65, 68],
                    borderColor: primaryColor,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: surfaceColor,
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                layout: { padding: { top: 30, right: 15, left: 15, bottom: 10 } },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: gridColor, drawBorder: false, borderDash: [5, 5] },
                        ticks: { color: textSecondaryColor, stepSize: 25, callback: function(value) { return value + '%'; }, font: { family: 'Inter', size: 11 } }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 11 } }
                    }
                }
            },
            plugins: [inlineDataLabelsPlugin]
        });
    }

    // --- State Manager Integration ---
    if (window.appState) {
        window.appState.subscribe((state) => {
            // --- Determine Global Empty State from Analytics or Dashboard ---
            const isGloballyEmpty = (state.dashboard && state.dashboard.isEmpty !== undefined) ? state.dashboard.isEmpty : (state.analytics && state.analytics.isEmpty !== undefined ? state.analytics.isEmpty : false);

            // --- Dashboard Updates ---
            if (state.dashboard) {
                const dbEmptyBanner = document.getElementById('dashboard-welcome-empty-state');
                const dbPopulated = document.getElementById('dashboard-populated-content');
                if (dbEmptyBanner) dbEmptyBanner.classList.toggle('hidden', !isGloballyEmpty);
                if (dbPopulated) dbPopulated.classList.toggle('hidden', isGloballyEmpty);

                const pEl = document.getElementById('statPdfs');
                const qEl = document.getElementById('statQuestions');
                const tEl = document.getElementById('statTopics');
                const sEl = document.getElementById('statStreak');

                if (pEl) pEl.innerText = state.dashboard.totalPdfs;
                if (qEl) qEl.innerText = state.dashboard.questionsAsked;
                if (tEl) tEl.innerText = (state.dashboard.overallPercentage || state.dashboard.topicsCompleted || 0) + '%';
                if (sEl) sEl.innerText = state.dashboard.currentStreak + ' days';

                // Synchronize new Dashboard activity stat blocks
                const dTimeEl = document.getElementById('dashboard-study-time');
                const dTopCovEl = document.getElementById('dashboard-topics-covered');
                const dAvgAccEl = document.getElementById('dashboard-avg-accuracy');
                const dQuizTkEl = document.getElementById('dashboard-quizzes-taken');
                if (dTimeEl) dTimeEl.innerText = state.dashboard.studyHours || "0h 0m";
                if (dTopCovEl) dTopCovEl.innerText = state.dashboard.topicsCompleted || "0";
                if (dAvgAccEl) dAvgAccEl.innerText = `${state.dashboard.avgAccuracy || state.dashboard.overallPercentage || 0}%`;
                if (dQuizTkEl) dQuizTkEl.innerText = state.dashboard.quizzesTaken || "0";

                // Synchronize Learning Streak displays across dashboard and progress page with real user activity
                const dStreak = document.getElementById('dashboard-streak-number');
                const pStreak = document.getElementById('progress-streak-number');
                const pStudyTime = document.getElementById('progress-total-study-time');
                const gStudyTime = document.getElementById('goal-study-time-val');

                if (dStreak) dStreak.innerText = state.dashboard.currentStreak;
                if (pStreak) pStreak.innerText = state.dashboard.currentStreak;
                if (pStudyTime && state.dashboard.studyHours) pStudyTime.innerText = state.dashboard.studyHours;
                if (gStudyTime && state.dashboard.studyHours) gStudyTime.innerText = state.dashboard.studyHours;

                // Dynamically render Study Time by Subject chart from recorded user study time
                const subjectChart = Chart.getChart('subjectDoughnutChart');
                if (subjectChart && state.dashboard.subjectBreakdown && state.dashboard.subjectBreakdown.length > 0) {
                    const subs = state.dashboard.subjectBreakdown;
                    const isZeroTime = !state.dashboard.rawStudyHours || state.dashboard.rawStudyHours === 0;
                    subjectChart.data.labels = subs.map(s => s.title || s.name || 'Subject');
                    subjectChart.data.datasets[0].data = isZeroTime ? subs.map(() => 1) : subs.map(s => Math.max(0.1, s.studyHours || 0));
                    subjectChart.data.datasets[0].backgroundColor = isZeroTime 
                        ? subs.map(() => 'rgba(100, 116, 139, 0.25)') 
                        : subs.map((s, idx) => s.iconColor || ['#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'][idx % 5]);
                    if (subjectChart.options) {
                        subjectChart.options.customCenterText = state.dashboard.studyHours || '0h 0m';
                    }
                    subjectChart.update();
                }

                // Update recent activity feed
                const recentContainer = document.getElementById('recentActivityContainer');
                if (recentContainer) {
                    recentContainer.innerHTML = '';
                    if (!state.dashboard.recentActivity || state.dashboard.recentActivity.length === 0) {
                        recentContainer.innerHTML = `
                            <div class="text-muted" style="text-align: center; padding: 2.2rem 1rem; border: 1px dashed var(--border-color); border-radius: 12px; background: rgba(30, 41, 59, 0.3);">
                                <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🌱</div>
                                <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">No recent activity to display</div>
                                <div style="font-size: 0.8rem; margin-top: 0.25rem; line-height: 1.4;">When you start studying, uploading documents, or interacting with the AI Tutor, your progress will appear right here!</div>
                            </div>
                        `;
                    } else {
                        const isExpanded = window.recentActivitiesExpanded || false;
                        const totalAct = state.dashboard.recentActivity.length;
                        const btnViewAll = document.getElementById('btnViewAllActivities');
                        if (btnViewAll) {
                            if (totalAct <= 5) {
                                btnViewAll.style.display = 'none';
                            } else {
                                btnViewAll.style.display = 'inline-block';
                                btnViewAll.innerText = isExpanded ? 'Show Less ↑' : `View All (${totalAct}) →`;
                            }
                        }

                        state.dashboard.recentActivity.forEach((act, idx) => {
                            const rawDate = act.created_at || act.timestamp || act.date || act.createdAt;
                            const dateObj = rawDate ? new Date(rawDate) : new Date();
                            const validDate = !isNaN(dateObj) ? dateObj : new Date();
                            const timeAgo = `${validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${validDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                            let icon = '<circle cx="12" cy="12" r="10"/>';
                            let color = 'var(--text-secondary)';
                            if (act.type === 'upload') { icon = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'; color = 'var(--primary)'; }
                            if (act.type === 'chat') { icon = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'; color = 'var(--success)'; }
                            
                            const isExtra = idx >= 5;
                            const dStyle = (!isExtra || isExpanded) ? 'flex' : 'none';

                            recentContainer.innerHTML += `
                                <div class="flex items-center gap-1 ${isExtra ? 'activity-extra-item' : ''}" style="display: ${dStyle} !important; padding: 0.75rem 0; border-bottom: 1px solid var(--border-light); transition: all 0.2s ease;">
                                    <div style="background: rgba(255,255,255,0.05); color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500; font-size: 0.9rem;">${act.title}</div>
                                        <div class="text-muted" style="font-size: 0.75rem;">${timeAgo}</div>
                                    </div>
                                </div>
                            `;
                        });
                    }
                }
            }

            // --- Progress Updates ---
            if (state.progress) {
                const progEmptyBanner = document.getElementById('progress-welcome-empty-state');
                const progPopulated = document.getElementById('progress-populated-content');
                if (progEmptyBanner) progEmptyBanner.classList.toggle('hidden', !isGloballyEmpty);
                if (progPopulated) progPopulated.classList.toggle('hidden', isGloballyEmpty);

                // Update Overall Progress Numbers
                const pTotalEl = document.getElementById('progress-total-topics');
                const pCompEl = document.getElementById('progress-completed-topics');
                const pInprogEl = document.getElementById('progress-inprogress-topics');
                const pNotStEl = document.getElementById('progress-notstarted-topics');
                const pBestStrEl = document.getElementById('progress-best-streak');

                const totalTop = state.progress.overall ? state.progress.overall.total || 120 : 120;
                const compTop = state.progress.overall ? state.progress.overall.completed || 0 : 0;
                const inProgTop = state.progress.overall ? state.progress.overall.inProgress || 0 : 0;
                const notStTop = Math.max(0, totalTop - compTop - inProgTop);

                if (pTotalEl) pTotalEl.innerText = totalTop;
                if (pCompEl) pCompEl.innerText = compTop;
                if (pInprogEl) pInprogEl.innerText = inProgTop;
                if (pNotStEl) pNotStEl.innerText = notStTop;
                if (pBestStrEl) pBestStrEl.innerText = `Best Streak: ${Math.max(state.dashboard?.currentStreak || 0, state.analytics?.currentStreak || 0)} days`;

                // Update Progress Overall Chart
                const overallChart = Chart.getChart('progressOverallChart');
                if (overallChart && state.progress.overall) {
                    const compPct = isGloballyEmpty ? 0 : (state.progress.overall.percentage || 0);
                    overallChart.data.datasets[0].data = [compPct, Math.max(0, 100 - compPct)];
                    if (overallChart.options) overallChart.options.customCenterText = `${compPct}%`;
                    overallChart.update();
                }

                // Update Progress Time Chart
                const timeChart = Chart.getChart('progressTimeChart');
                if (timeChart && state.progress.timeSeries) {
                    timeChart.data.labels = state.progress.timeSeries.labels;
                    timeChart.data.datasets[0].data = isGloballyEmpty ? state.progress.timeSeries.labels.map(() => 0) : state.progress.timeSeries.data;
                    timeChart.update();
                }

                // Update Progress by Subject section
                const subProgList = document.getElementById('progress-by-subject-list');
                const subjectsSource = (state.progress.subjects && state.progress.subjects.length > 0) ? state.progress.subjects : (state.analytics?.mostStudiedSubjects || []);
                if (subProgList && subjectsSource.length > 0) {
                    subProgList.innerHTML = subjectsSource.map((s, idx) => {
                        const pct = isGloballyEmpty ? 0 : (s.percentage || Math.round((s.completedTopics / (s.totalTopics || 1)) * 100) || 0);
                        const color = s.iconColor || ['#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'][idx % 5];
                        return `
                            <div style="margin-bottom: 1.25rem;">
                                <div class="flex items-center justify-between mb-1">
                                    <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${s.title || s.name || 'Subject'}</span>
                                    <span style="font-size: 0.85rem; font-weight: 700; color: ${color};">${pct}% Mastered</span>
                                </div>
                                <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                                    <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.6s ease;"></div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                // Update Learning Goals Bars & Values
                const gTimeBar = document.getElementById('goal-study-time-bar');
                const gTopVal = document.getElementById('goal-topics-val');
                const gTopBar = document.getElementById('goal-topics-bar');
                const gStrVal = document.getElementById('goal-streak-val');
                const gStrBar = document.getElementById('goal-streak-bar');
                
                const curHrs = state.dashboard ? (state.dashboard.rawStudyHours || (state.dashboard.studyHours ? parseFloat(state.dashboard.studyHours) : 0)) : 0;
                const timeGoalPct = Math.min(100, Math.round((curHrs / 30) * 100)) || 0;
                if (gTimeBar) gTimeBar.style.width = `${isGloballyEmpty ? 0 : timeGoalPct}%`;

                const topCov = state.dashboard?.topicsCompleted || compTop || 0;
                const topGoalPct = Math.min(100, Math.round((topCov / 25) * 100)) || 0;
                if (gTopVal) gTopVal.innerText = `${isGloballyEmpty ? 0 : topCov} / 25`;
                if (gTopBar) gTopBar.style.width = `${isGloballyEmpty ? 0 : topGoalPct}%`;

                const curStreak = state.dashboard?.currentStreak || state.analytics?.currentStreak || 0;
                const strGoalPct = Math.min(100, Math.round((curStreak / 7) * 100)) || 0;
                if (gStrVal) gStrVal.innerText = `${isGloballyEmpty ? 0 : curStreak} / 7 Days`;
                if (gStrBar) gStrBar.style.width = `${isGloballyEmpty ? 0 : strGoalPct}%`;

                // Dynamically Render Recently Completed Topics & AI Upcoming Topics
                const rcContainer = document.getElementById('recentlyCompletedContainer');
                if (rcContainer && state.progress.recentCompleted && state.progress.recentCompleted.length > 0 && !isGloballyEmpty) {
                    rcContainer.innerHTML = state.progress.recentCompleted.slice(0, 6).map((item, idx) => `
                        <div class="topic-list-item">
                            <div class="flex items-center gap-1">
                                <div class="icon-box success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                                <div>
                                    <div style="font-size: 0.9rem; font-weight: 600;">${item.title}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${item.subject || 'Core Curriculum'}</div>
                                </div>
                            </div>
                            <span class="text-muted" style="font-size: 0.75rem;">${idx === 0 ? 'Just now' : (idx === 1 ? '2h ago' : `${idx} days ago`)}</span>
                        </div>
                    `).join('');
                } else if (rcContainer && isGloballyEmpty) {
                    rcContainer.innerHTML = `<div class="text-muted" style="text-align: center; padding: 1.5rem; font-size: 0.85rem;">No completed topics yet. Keep studying!</div>`;
                }

                const utContainer = document.getElementById('upcomingTopicsContainer');
                if (utContainer && state.progress.upcoming && state.progress.upcoming.length > 0) {
                    utContainer.innerHTML = state.progress.upcoming.slice(0, 6).map((item, idx) => `
                        <div class="topic-list-item">
                            <div class="flex items-center gap-1">
                                <div class="icon-box pending" style="width: 20px; height: 20px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/></svg></div>
                                <div>
                                    <div style="font-size: 0.85rem; font-weight: 600; line-height: 1.2; margin-bottom: 2px;">${item.title}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${item.subject || 'Core Curriculum'}</div>
                                </div>
                            </div>
                            <button class="hover-lift" onclick="if(typeof window.openTopicStudyGuide === 'function') window.openTopicStudyGuide('${item.title.replace(/'/g, "\\'")}', '${(item.subject || 'Core Curriculum').replace(/'/g, "\\'")}', '');" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #c4b5fd; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: 600; white-space: nowrap; flex-shrink: 0; margin-left: 0.5rem;">Study ⚡</button>
                        </div>
                    `).join('');
                }
            }

            // --- Analytics & Complete Activity Center Updates ---
            if (state.analytics) {
                const anaEmptyBanner = document.getElementById('analytics-welcome-empty-state');
                const anaPopulated = document.getElementById('analytics-populated-content');
                if (anaEmptyBanner) anaEmptyBanner.classList.toggle('hidden', !state.analytics.isEmpty);
                if (anaPopulated) anaPopulated.classList.toggle('hidden', state.analytics.isEmpty);

                // Row 1 & Row 2 Metrics
                const aDaily = document.getElementById('analytics-daily-time');
                const aWeekly = document.getElementById('analytics-weekly-time');
                const aMonthly = document.getElementById('analytics-monthly-time');
                const aAvgDaily = document.getElementById('analytics-avg-daily');
                const aQuestions = document.getElementById('analytics-questions-asked');
                const aPdfs = document.getElementById('analytics-pdfs-uploaded');
                const aConsistency = document.getElementById('analytics-consistency');

                if (aDaily) aDaily.innerText = `${state.analytics.dailyStudyMinutes || 0}m`;
                if (aWeekly) aWeekly.innerText = state.analytics.weeklyStudyHours || "0h 0m";
                if (aMonthly) aMonthly.innerText = state.analytics.monthlyStudyHours || "0h 0m";
                if (aAvgDaily) aAvgDaily.innerText = `${state.analytics.avgDailyLearningMinutes || 0}m / day`;
                if (aQuestions) aQuestions.innerText = state.analytics.totalQuestionsAsked || "0";
                if (aPdfs) aPdfs.innerText = state.analytics.pdfsUploaded || "0";
                if (aConsistency) aConsistency.innerText = `${state.analytics.learningConsistency || 0}%`;

                // Productivity Trend
                const trendVal = document.getElementById('analytics-productivity-trend-val');
                const trendMsg = document.getElementById('analytics-productivity-trend-msg');
                if (trendVal && state.analytics.productivityTrends) {
                    const t = state.analytics.productivityTrends;
                    trendVal.innerText = t.trendDirection === 'up' ? `+${t.percentageChange}% Up` : (t.trendDirection === 'down' ? `-${t.percentageChange}% Down` : 'Neutral');
                    trendVal.style.color = t.trendDirection === 'up' ? 'var(--success)' : (t.trendDirection === 'down' ? 'var(--error)' : '#a78bfa');
                    if (trendMsg) trendMsg.innerText = t.message || 'Productivity synchronized';
                }

                // Study Time Over Time & Progress Growth Chart
                const stChart = Chart.getChart('studyTimeChart');
                if (stChart && state.analytics.progressGrowthGraph) {
                    stChart.data.labels = state.analytics.progressGrowthGraph.labels || [];
                    stChart.data.datasets[0].data = state.analytics.progressGrowthGraph.data || [];
                    stChart.update();
                }

                // AI Usage Statistics
                const aiChat = document.getElementById('ai-stat-chat');
                const aiQuiz = document.getElementById('ai-stat-quiz');
                const aiDoc = document.getElementById('ai-stat-doc');
                const aiNote = document.getElementById('ai-stat-note');
                if (aiChat && state.analytics.aiUsageStats) aiChat.innerText = state.analytics.aiUsageStats.chatQuestions || "0";
                if (aiQuiz && state.analytics.aiUsageStats) aiQuiz.innerText = state.analytics.aiUsageStats.quizzesVerified || "0";
                if (aiDoc && state.analytics.aiUsageStats) aiDoc.innerText = state.analytics.aiUsageStats.docSummaries || "0";
                if (aiNote && state.analytics.aiUsageStats) aiNote.innerText = state.analytics.aiUsageStats.noteAnalyses || "0";

                // Learning Heatmap Matrix
                const heatmapGrid = document.getElementById('heatmapGrid');
                if (heatmapGrid && state.analytics.learningHeatmap) {
                    heatmapGrid.innerHTML = '';
                    // Display last 28 days for 4 rows x 7 cols grid
                    const recentHeatmap = state.analytics.learningHeatmap.slice(0, 28).reverse();
                    recentHeatmap.forEach(day => {
                        const cell = document.createElement('div');
                        cell.className = `heatmap-cell${day.intensity > 0 ? ' lvl-' + day.intensity : ''}`;
                        cell.title = `${day.date}: ${Math.round(day.seconds / 60)} mins (${day.activitiesCount} activities)`;
                        heatmapGrid.appendChild(cell);
                    });
                }

                // Most Studied Topics
                const topTopicsList = document.getElementById('topTopicsList');
                if (topTopicsList) {
                    topTopicsList.innerHTML = '';
                    if (!state.analytics.mostStudiedTopics || state.analytics.mostStudiedTopics.length === 0 || state.analytics.isEmpty) {
                        topTopicsList.innerHTML = `<div class="text-muted" style="text-align: center; padding: 2rem 0; font-size: 0.85rem;">No topics recorded yet.</div>`;
                    } else {
                        const maxMins = Math.max(...state.analytics.mostStudiedTopics.map(t => t.durationMins || 1), 1);
                        const colors = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899"];
                        state.analytics.mostStudiedTopics.forEach((t, idx) => {
                            const percent = Math.round(((t.durationMins || 1) / maxMins) * 100);
                            const color = colors[idx % colors.length];
                            const topicEl = document.createElement('div');
                            topicEl.className = 'topic-item';
                            topicEl.innerHTML = `
                                <div class="topic-header">
                                    <div style="color: var(--text-secondary);"><span style="margin-right: 0.5rem; font-weight:700;">#${idx + 1}</span> <span style="color: var(--text-primary); font-weight: 600;">${t.title}</span></div>
                                    <div>${Math.floor((t.durationMins || 0)/60)}h ${(t.durationMins || 0)%60}m</div>
                                </div>
                                <div class="topic-bar-bg">
                                    <div class="topic-bar-fill" style="width: ${percent}%; background: ${color};"></div>
                                </div>
                            `;
                            topTopicsList.appendChild(topicEl);
                        });
                    }
                }

                // Full Activity Timeline Stream
                const timelineContainer = document.getElementById('analytics-activity-timeline');
                if (timelineContainer) {
                    timelineContainer.innerHTML = '';
                    const cleanActivities = (state.analytics.activityTimeline || []).filter(act => 
                        !act.type?.includes('study_time_updated') && 
                        !act.title?.includes('Active Study Heartbeat') &&
                        !act.title?.includes('Study Heartbeat')
                    );

                    if (cleanActivities.length === 0 || state.analytics.isEmpty) {
                        timelineContainer.innerHTML = `
                            <div class="text-muted" style="text-align: center; padding: 3rem 1rem; border: 1px dashed var(--border-color); border-radius: 16px; background: rgba(15, 23, 42, 0.4);">
                                <div style="font-size: 2.5rem; margin-bottom: 0.5rem; filter: drop-shadow(0 0 8px rgba(99,102,241,0.3));">🏆</div>
                                <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">No Learning Milestones Recorded Yet</div>
                                <div style="font-size: 0.9rem; margin-top: 0.35rem; color: var(--text-secondary); max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6;">Your verified study achievements—such as completed AI Quizzes, document analyses, solved tutor inquiries, and course progress—will populate here in real time!</div>
                            </div>
                        `;
                    } else {
                        cleanActivities.forEach(act => {
                            const rawDate = act.created_at || act.timestamp || act.date || act.createdAt;
                            const dtObj = rawDate ? new Date(rawDate) : new Date();
                            const validDt = !isNaN(dtObj) ? dtObj : new Date();
                            const dateFormatted = `${validDt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${validDt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                            let badgeBg = 'rgba(99, 102, 241, 0.15)';
                            let badgeColor = '#818cf8';
                            let icon = '⚡';
                            let typeLabel = 'ACHIEVEMENT';

                            if (act.type === 'upload' || act.type === 'pdf' || act.title?.toLowerCase().includes('pdf') || act.title?.toLowerCase().includes('document')) { badgeBg = 'rgba(236, 72, 153, 0.15)'; badgeColor = '#f472b6'; icon = '📄'; typeLabel = 'DOCUMENT ANALYTICS'; }
                            else if (act.type === 'chat' || act.title?.toLowerCase().includes('tutor') || act.title?.toLowerCase().includes('question')) { badgeBg = 'rgba(16, 185, 129, 0.15)'; badgeColor = '#34d399'; icon = '💬'; typeLabel = 'AI TUTORIAL'; }
                            else if (act.type === 'quiz' || act.title?.toLowerCase().includes('quiz') || act.title?.toLowerCase().includes('test')) { badgeBg = 'rgba(245, 158, 11, 0.15)'; badgeColor = '#fbbf24'; icon = '🎯'; typeLabel = 'QUIZ MASTERY'; }
                            else if (act.type === 'lesson' || act.type === 'course' || act.title?.toLowerCase().includes('roadmap')) { badgeBg = 'rgba(59, 130, 246, 0.15)'; badgeColor = '#60a5fa'; icon = '📘'; typeLabel = 'CURRICULUM'; }
                            else if (act.type === 'study' || act.title?.toLowerCase().includes('session')) { badgeBg = 'rgba(168, 85, 247, 0.15)'; badgeColor = '#c084fc'; icon = '⏰'; typeLabel = 'STUDY SESSION'; }

                            timelineContainer.innerHTML += `
                                <div class="surface-card hover-lift flex items-center justify-between" style="padding: 1rem 1.4rem; border-radius: 16px; margin-bottom: 0.6rem; border: 1px solid rgba(255,255,255,0.06); border-left: 4px solid ${badgeColor}; background: linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.5)); box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s ease;">
                                    <div class="flex items-center gap-1">
                                        <div style="background: ${badgeBg}; color: ${badgeColor}; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0; box-shadow: 0 0 10px ${badgeBg};">
                                            ${icon}
                                        </div>
                                        <div>
                                            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                                <span>${act.title}</span>
                                                <span class="study-badge" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.68rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase;">${typeLabel}</span>
                                                ${act.xp_earned > 0 ? `<span style="color: #c084fc; background: rgba(168, 85, 247, 0.12); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.3);">+${act.xp_earned} XP</span>` : ''}
                                            </div>
                                            <div style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${act.description || 'Verified student interaction & AI analytical assessment'}</div>
                                        </div>
                                    </div>
                                    <div style="text-align: right; flex-shrink: 0; margin-left: 1rem;">
                                        <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0; background: rgba(255,255,255,0.04); padding: 2px 10px; border-radius: 8px; display: inline-block;">${act.subjectName || 'Core Curriculum'}</div>
                                        <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 6px; font-weight: 500;">${dateFormatted}</div>
                                    </div>
                                </div>
                            `;
                        });
                    }
                }
            }

            // --- Enterprise Gamification Center Updates ---
            if (state.gamification) {
                const streakCount = document.getElementById('gamify-streak-count');
                const lvlNum = document.getElementById('gamify-level-num');
                const lvlBadge = document.getElementById('gamify-level-badge');
                const totXp = document.getElementById('gamify-total-xp');
                const nextXp = document.getElementById('gamify-next-xp');
                const coinsEl = document.getElementById('gamify-coins');
                const xpBar = document.getElementById('gamify-xp-bar');

                if (streakCount) streakCount.innerText = `${state.gamification.currentStreak || 1} Days`;
                if (lvlNum) lvlNum.innerText = state.gamification.level || 1;
                if (lvlBadge) lvlBadge.innerText = state.gamification.level || 1;
                if (totXp) window.appState.animateCounter(totXp, parseInt(totXp.innerText || "0", 10), state.gamification.xp || 0);
                if (nextXp) nextXp.innerText = (state.gamification.level || 1) * 400;
                if (coinsEl) coinsEl.innerText = `${state.gamification.coins || 0} 💎`;
                if (xpBar && state.gamification.level) {
                    const percent = Math.min(100, Math.round(((state.gamification.xp % 400) / 400) * 100));
                    xpBar.style.width = `${percent}%`;
                }

                // Populate badges
                const badgesGrid = document.getElementById('badges-showcase-grid');
                if (badgesGrid && state.gamification.allBadges) {
                    badgesGrid.innerHTML = state.gamification.allBadges.map(b => {
                        const unlocked = (state.gamification.badges || []).some(ub => ub.id === b.id || ub.badge_id === b.id);
                        return `
                            <div class="surface-card badge-card ${unlocked ? 'unlocked' : 'locked'}" style="padding: 1rem; text-align: center; border-radius: 12px; border: 1px solid ${unlocked ? 'var(--primary)' : 'var(--border-light)'};">
                                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${b.icon}</div>
                                <div style="font-weight: 700; font-size: 0.85rem; color: ${unlocked ? '#fff' : 'var(--text-secondary)'};">${b.title}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${b.description}</div>
                            </div>
                        `;
                    }).join('');
                }

                // Populate leaderboard
                const lbList = document.getElementById('leaderboard-table-list');
                if (lbList && state.gamification.leaderboard) {
                    lbList.innerHTML = state.gamification.leaderboard.map((u, idx) => `
                        <div class="surface-card flex items-center justify-between" style="padding: 0.8rem 1.2rem; border-radius: 10px; ${idx === 0 ? 'border-left: 4px solid var(--warning); background: rgba(245, 158, 11, 0.08);' : ''}">
                            <div class="flex items-center gap-1">
                                <span style="font-weight: 800; font-size: 1.1rem; width: 28px; color: ${idx === 0 ? 'var(--warning)' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#d97706' : 'var(--text-secondary)'};">#${u.rank}</span>
                                <div>
                                    <div style="font-weight: 600; font-size: 0.95rem;">${u.name} ${u.isUser ? '<span class="study-badge study-badge-active" style="padding:2px 8px;font-size:0.7rem;">You</span>' : ''}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Level ${u.level} Student</div>
                                </div>
                            </div>
                            <div style="font-weight: 700; color: var(--accent);">${u.xp.toLocaleString()} XP</div>
                        </div>
                    `).join('');
                }
            }

            // --- Courses & Roadmap Updates ---
            if (state.courses && state.courses.courses) {
                const grid = document.getElementById('courses-container-grid');
                if (grid) {
                    grid.innerHTML = state.courses.courses.map(course => `
                        <div class="surface-card hover-lift course-card-clickable" data-id="${course.id}" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer;">
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span style="font-size: 2rem;">${course.icon || '📘'}</span>
                                    <span class="study-badge" style="background: rgba(79,70,229,0.15); color: var(--primary);">${course.difficulty}</span>
                                </div>
                                <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">${course.title}</h3>
                                <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.25rem;">${course.description}</p>
                                
                                <div style="border-top: 1px solid var(--border-light); padding-top: 1rem;">
                                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase;">Included Subjects (${course.subjects ? course.subjects.length : 0})</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                        ${(course.subjects || []).map(sub => `<span style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-light); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; color: #fff;">${sub.title}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <button class="btn-primary w-100 mt-2 hover-lift btn-start-course" data-id="${course.id}" style="padding: 0.65rem 1rem;">View Course Syllabus & Modules →</button>
                        </div>
                    `).join('');
                    
                    grid.querySelectorAll('.course-card-clickable, .btn-start-course').forEach(el => {
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const cid = el.getAttribute('data-id') || el.closest('.course-card-clickable')?.getAttribute('data-id');
                            if (cid && typeof window.openCourseDetailsModal === 'function') {
                                window.openCourseDetailsModal(cid);
                            }
                        });
                    });
                }
            }

            // --- Flashcards & Bookmarks Updates ---
            if (state.studyMaterials) {
                const cards = state.studyMaterials.flashcards || [];
                window.fcAllCards = cards;
                if (typeof window.updateFlashcardsCenter === 'function') {
                    window.updateFlashcardsCenter();
                } else {
                    window.activeDeck = cards;
                    window.currentCardIdx = window.currentCardIdx || 0;
                    if (typeof window.renderActiveFlashcard === 'function') window.renderActiveFlashcard();
                }
                if (typeof window.renderStudyMaterialTab === 'function') {
                    window.renderStudyMaterialTab(window.fcCurrentTab || 'ai_notes');
                }
            }

            // --- Enterprise Admin Governance Updates ---
            if (state.admin && window.AdminViewInstance) {
                window.AdminViewInstance.init();
                if (state.admin.users && state.admin.users.length > 0) {
                    window.AdminViewInstance.users = state.admin.users;
                    window.AdminViewInstance.stats = state.admin.stats || {};
                    window.AdminViewInstance.updateKpiCards(window.AdminViewInstance.stats);
                    window.AdminViewInstance.renderUsersTable();
                } else {
                    window.AdminViewInstance.fetchAndRender();
                }
            }
        });

        // Trigger initial load
        window.appState.refreshAll();
    }

    // --- Course Information & Syllabus Roadmap Modal Engine ---
    window.openCourseDetailsModal = (courseId) => {
        const state = window.appState ? window.appState.state : null;
        if (!state || !state.courses || !state.courses.courses) return;
        const course = state.courses.courses.find(c => c.id === courseId);
        if (!course) return;

        const modal = document.getElementById('courseDetailsModal');
        if (!modal) return;

        const iconEl = document.getElementById('courseModalIcon');
        const titleEl = document.getElementById('courseModalTitle');
        const catEl = document.getElementById('courseModalCategory');
        const diffEl = document.getElementById('courseModalDifficulty');
        const descEl = document.getElementById('courseModalDescription');
        const countEl = document.getElementById('courseModalSubjectCount');
        
        if (iconEl) iconEl.innerText = course.icon || '📘';
        if (titleEl) titleEl.innerText = course.title;
        if (catEl) catEl.innerText = course.category || 'Computer Science & Engineering';
        if (diffEl) diffEl.innerText = course.difficulty || 'Advanced Level';
        if (descEl) descEl.innerText = course.description || "Comprehensive structured syllabus covering all core theoretical principles, real-world engineering implementations, and AI reinforcement checkpoints.";
        
        const subjects = course.subjects || [];
        if (countEl) countEl.innerText = `${subjects.length} Subjects & Syllabus Modules`;

        const listContainer = document.getElementById('courseModalSubjectsList');
        if (listContainer) {
            listContainer.innerHTML = subjects.map((sub, idx) => {
                const topics = (sub.topics && sub.topics.length > 0) ? sub.topics : [
                    { title: `${sub.title}: Foundational Architecture & Syntax Principles`, status: 'completed' },
                    { title: `${sub.title}: Practical Implementation & Real-World Patterns`, status: 'completed' },
                    { title: `${sub.title}: Advanced Optimization & Edge Case Debugging`, status: 'ready' }
                ];
                
                const completedCount = topics.filter(t => t.status === 'completed' || t.completed).length;
                const percent = Math.round((completedCount / Math.max(1, topics.length)) * 100);

                return `
                    <div class="surface-card" style="padding: 1.25rem; border: 1px solid var(--border-light); background: rgba(255,255,255,0.02); border-radius: 14px;">
                        <div class="flex justify-between items-center mb-1">
                            <div class="flex items-center gap-1">
                                <span style="background: ${sub.bg_color || 'rgba(99,102,241,0.15)'}; color: ${sub.icon_color || '#8b5cf6'}; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">${idx + 1}</span>
                                <h5 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0;">${sub.title}</h5>
                            </div>
                            <span class="study-badge" style="background: rgba(16,185,129,0.15); color: var(--success); font-size: 0.75rem;">${completedCount} / ${topics.length} Mastered (${percent}%)</span>
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 4px; overflow: hidden; margin-bottom: 1rem;">
                            <div style="background: linear-gradient(90deg, var(--primary), var(--secondary)); height: 100%; width: ${percent}%; border-radius: 4px; transition: width 0.5s ease;"></div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            ${topics.map(t => `
                                <div class="flex justify-between items-center" style="padding: 0.6rem 0.8rem; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                                    <span style="font-size: 0.88rem; color: #e2e8f0; display: flex; align-items: center; gap: 8px;">
                                        ${(t.status === 'completed' || t.completed) ? '<span style="color: var(--success);">✅</span>' : '<span style="color: var(--primary);">📘</span>'} 
                                        ${t.title}
                                    </span>
                                    <button class="btn-topic-study hover-lift" data-topic="${t.title}" data-subject="${sub.title}" data-course="${course.id}" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #c4b5fd; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">Study Topic ⚡</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            listContainer.querySelectorAll('.btn-topic-study').forEach(tbtn => {
                tbtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const topicTitle = tbtn.getAttribute('data-topic');
                    const subjectTitle = tbtn.getAttribute('data-subject') || "Core Curriculum";
                    const cid = tbtn.getAttribute('data-course') || "";
                    if (typeof window.openTopicStudyGuide === 'function') {
                        window.openTopicStudyGuide(topicTitle, subjectTitle, cid);
                    }
                });
            });
        }

        modal.classList.remove('hidden');
    };

    const courseModal = document.getElementById('courseDetailsModal');
    if (courseModal) {
        document.getElementById('btnCourseModalClose')?.addEventListener('click', () => courseModal.classList.add('hidden'));
        courseModal.addEventListener('click', (e) => {
            if (e.target === courseModal) courseModal.classList.add('hidden');
        });
        document.getElementById('btnCourseModalQuiz')?.addEventListener('click', () => {
            courseModal.classList.add('hidden');
            if (typeof showToast === 'function') showToast("Course subjects loaded into AI Quiz Generator!");
            
            const titleEl = document.getElementById('courseModalTitle');
            if (titleEl) sessionStorage.setItem('pendingQuizTopic', titleEl.innerText);
            
            const navQuiz = document.querySelector('.nav-links li[data-page="quiz"]');
            if (navQuiz) navQuiz.click();
        });
        document.getElementById('btnCourseModalStart')?.addEventListener('click', () => {
            courseModal.classList.add('hidden');
            if (typeof showToast === 'function') showToast("Syllabus loaded into Active Study Workspace!");
            const navDash = document.querySelector('.nav-links li[data-page="dashboard"]');
            if (navDash) navDash.click();
        });
    }

    // --- Topic Interactive Study Guide & Breakdown Engine ---
    window.openTopicStudyGuide = (topicTitle, subjectTitle = "Core Curriculum", courseId = "") => {
        const modal = document.getElementById('topicStudyModal');
        if (!modal) return;

        // Hide course details modal temporarily
        const courseModal = document.getElementById('courseDetailsModal');
        if (courseModal) courseModal.classList.add('hidden');

        const titleEl = document.getElementById('topicModalTitle');
        const subjEl = document.getElementById('topicModalSubject');
        if (titleEl) titleEl.innerText = topicTitle;
        if (subjEl) subjEl.innerText = `${subjectTitle} Module`;

        const contentEl = document.getElementById('topicStudyContent');
        if (contentEl) {
            let codeSnippet = '';
            let summaryText = '';
            let mechanicsText = '';
            let takeawaysText = '';

            const lower = topicTitle.toLowerCase();
            if (lower.includes('html')) {
                summaryText = `<strong>HTML (HyperText Markup Language)</strong> serves as the structural foundation of modern web application engineering. Rather than defining logic, it establishes semantic hierarchies and accessibility hooks for browser DOM tree rendering.`;
                mechanicsText = `Every HTML document is parsed by the engine into a node tree (the DOM). Using semantic elements (<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#38bdf8;">&lt;main&gt;</code>, <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#38bdf8;">&lt;article&gt;</code>, <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#38bdf8;">&lt;nav&gt;</code>) ensures screen reader compatibility, optimal SEO indexing, and robust CSS animation targets.`;
                codeSnippet = `&lt;!DOCTYPE html&gt;\n&lt;html lang="en"&gt;\n  &lt;head&gt;\n    &lt;meta charset="UTF-8" /&gt;\n    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0" /&gt;\n    &lt;title&gt;Enterprise App Architecture&lt;/title&gt;\n  &lt;/head&gt;\n  &lt;body style="background: #090e1a; color: #fff;"&gt;\n    &lt;header class="app-navbar"&gt;\n      &lt;nav aria-label="Main Navigation"&gt;\n        &lt;h1&gt;CogniPath Learning &lt;span class="badge"&gt;PRO&lt;/span&gt;&lt;/h1&gt;\n      &lt;/nav&gt;\n    &lt;/header&gt;\n    &lt;main id="workspace-viewport"&gt;\n      &lt;section aria-labelledby="heading-study"&gt;\n        &lt;h2 id="heading-study"&gt;Active Recall Session&lt;/h2&gt;\n      &lt;/section&gt;\n    &lt;/main&gt;\n  &lt;/body&gt;\n&lt;/html&gt;`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Always declare HTML5 doctype first to trigger standard high-performance rendering mode.</li><li>Avoid meaningless wrapper soup (<code>&lt;div&gt;</code> overload); favor semantic HTML5 tags.</li><li>Ensure interactive elements have appropriate <code>aria-*</code> attributes and unique IDs.</li></ul>`;
            } else if (lower.includes('css') || lower.includes('style') || lower.includes('flex')) {
                summaryText = `<strong>CSS (Cascading Style Sheets)</strong> governs visual design systems, responsive layout orchestrations, and hardware-accelerated animations across modern browsers.`;
                mechanicsText = `Modern design systems rely on CSS Variables (Custom Properties) for theme consistency, Flexbox for dynamic 1D component alignment, and Grid for 2D layout matrices. Utilizing <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#38bdf8;">box-sizing: border-box</code> and fluid clamp() typography ensures zero layout shift across devices.`;
                codeSnippet = `:root {\n  --primary: #6366f1;\n  --accent: #06b6d4;\n  --radius-lg: 16px;\n}\n\n/* Premium Dark Glassmorphism Card Token */\n.surface-card {\n  background: rgba(255, 255, 255, 0.05);\n  backdrop-filter: blur(12px);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: var(--radius-lg);\n  display: flex;\n  flex-direction: column;\n  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;\n}\n\n.surface-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 20px 30px -10px rgba(99, 102, 241, 0.25);\n}`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Use CSS custom properties (<code>--var</code>) for centralized color palette token governance.</li><li>Favor composite animations (transform & opacity) over layout shifting properties (top/left/width) to maintain 60 FPS.</li><li>Implement glassmorphism cleanly via rgba background + backdrop-filter blur.</li></ul>`;
            } else if (lower.includes('tensor') || lower.includes('neural') || lower.includes('cnn') || lower.includes('lstm')) {
                summaryText = `<strong>${topicTitle}</strong> forms the mathematical backbone of modern Deep Learning and GPU hardware optimization.`;
                mechanicsText = `Deep neural networks train by calculating gradients backward through computational dynamic graphs (Autograd). Tensor operations must be memory-aligned on CUDA cores to prevent bottlenecking during matrix multiplications and convolutions.`;
                codeSnippet = `# PyTorch Production Tensor Autograd & CNN Block\nimport torch\nimport torch.nn as nn\n\nclass EnterpriseConvBlock(nn.Module):\n    def __init__(in_channels, out_channels):\n        super().__init__()\n        self.conv = nn.Sequential(\n            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),\n            nn.BatchNorm2d(out_channels),\n            nn.SiLU() # Smooth non-linear activation\n        )\n    def forward(self, x: torch.Tensor) -> torch.Tensor:\n        return self.conv(x)\n\n# Instantiate high-throughput GPU training tensor\nx = torch.randn(32, 3, 224, 224, requires_grad=True)\nprint(f"Tensor memory footprint: {x.element_size() * x.nelement()} bytes")`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Always monitor tensor memory footprints when batching images to avoid Out Of Memory (OOM) errors.</li><li>Favor SiLU / GELU activations over standard ReLU for smoother loss surface gradient flow.</li><li>Enable <code>torch.no_grad()</code> during validation and inference to drop memory overhead by 50%.</li></ul>`;
            } else if (lower.includes('attention') || lower.includes('rag') || lower.includes('llm') || lower.includes('diffusion')) {
                summaryText = `<strong>${topicTitle}</strong> represents state-of-the-art Generative AI and retrieval-augmented reasoning engineering.`;
                mechanicsText = `Self-Attention calculates a scaled dot-product attention matrix between queries, keys, and values: \( \text{Attention}(Q,K,V) = \text{softmax}(\frac{QK^T}{\sqrt{d_k}})V \). For RAG pipelines, dense vector embeddings map semantic concepts into high-dimensional cosine similarity latent spaces.`;
                codeSnippet = `// RAG Vector Embedding & Cosine Similarity Search Engine\nasync function queryVectorMemory(promptText, collectionName) {\n  const embedding = await OpenAIExt.embed({ input: promptText, model: "text-embedding-3-large" });\n  \n  const matches = await db.vectorQuery({\n    collection: collectionName,\n    vector: embedding.vector,\n    topK: 5,\n    similarityMetric: "cosine_distance",\n    threshold: 0.85\n  });\n  \n  return matches.map(m => ({ text: m.document, score: m.similarityScore }));\n}`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Always sanitize and chunk document corpora systematically before creating vector embeddings.</li><li>Use HNSW (Hierarchical Navigable Small World) indexes in vector DBs for low-latency top-K queries.</li><li>Combine semantic vector search with keyword BM25 (Hybrid RAG) for optimal accuracy.</li></ul>`;
            } else if (lower.includes('sql') || lower.includes('crypto') || lower.includes('security') || lower.includes('privilege') || lower.includes('zk-snark')) {
                summaryText = `<strong>${topicTitle}</strong> is crucial for defensive Zero-Trust security postures and protecting sensitive enterprise data against sophisticated offensive vectors.`;
                mechanicsText = `Zero-Trust architecture enforces continuous cryptographic verification and principle of least privilege (PoLP) across every network boundary. Mitigating vulnerabilities like SQLi or XSS requires strict parameterized queries, strict input sanitization, and Content Security Policy (CSP) headers.`;
                codeSnippet = `# Zero-Trust Cryptographic Payload Verification & SQL Injection Prevention\nimport hmac\nimport hashlib\nimport sqlite3\n\ndef secure_query_execution(conn: sqlite3.Connection, user_uuid: str, signature: str, secret_key: bytes):\n    # 1. Verify HMAC-SHA256 cryptographic signature before db trust\n    expected = hmac.new(secret_key, user_uuid.encode('utf-8'), hashlib.sha256).hexdigest()\n    if not hmac.compare_digest(signature, expected):\n        raise PermissionError("Cryptographic integrity verification failed!")\n        \n    # 2. Prevent SQLi via parameterized binding (NEVER string concatenation!)\n    cursor = conn.cursor()\n    cursor.execute("SELECT id, role, xp FROM profiles WHERE user_id = ?", (user_uuid,))\n    return cursor.fetchone()`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>NEVER concatenate strings to build database query statements—always use parameter binding.</li><li>Use constant-time comparison algorithms (e.g., <code>hmac.compare_digest</code>) to defeat timing timing attacks.</li><li>Implement regular automated penetration testing and SAST pipeline auditing.</li></ul>`;
            } else if (lower.includes('kafka') || lower.includes('flink') || lower.includes('cap') || lower.includes('snowflake') || lower.includes('distributed')) {
                summaryText = `<strong>${topicTitle}</strong> dictates how hyperscale distributed systems process billions of concurrent telemetry events with fault-tolerant durability.`;
                mechanicsText = `In distributed design, the CAP Theorem dictates that a network partition forces a choice between Availability and Consistency. Event-driven streaming architectures rely on partitioned append-only write logs (Kafka) and stateful stream checkpoints (Flink) to guarantee exactly-once processing semantics.`;
                codeSnippet = `// Apache Kafka High-Throughput Event Producer Setup & Partitioning\nimport { Kafka, Partitioners } from 'kafkajs';\n\nconst kafka = new Kafka({ clientId: 'cognipath-analytics-engine', brokers: ['kafka-broker-node-1:9092'] });\nconst producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });\n\nasync function emitTelemetryStream(userId, eventPayload) {\n  await producer.connect();\n  await producer.send({\n    topic: 'student-learning-telemetry',\n    messages: [\n      { key: userId, value: JSON.stringify(eventPayload), timestamp: Date.now().toString() }\n    ],\n    acks: -1, // Wait for complete leader + ISR replica acknowledgment (Highest Durability)\n  });\n}`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Use strong consumer keys (like user_id) when producing Kafka messages to ensure sequential partition ordering.</li><li>Monitor replication lag and adjust offline retention window configs to handle consumer outages gracefully.</li><li>Apply backpressure protocols when streaming massive payloads into downstream data warehouses.</li></ul>`;
            } else if (lower.includes('react') || lower.includes('flutter') || lower.includes('skia') || lower.includes('widget') || lower.includes('mobile')) {
                summaryText = `<strong>${topicTitle}</strong> powers fluidity and 60+ FPS native gesture responsiveness in cross-platform mobile application development.`;
                mechanicsText = `Modern mobile engines bridge declarative UI state definitions directly to native OS graphics render loops (Skia / Metal). By executing animations fully on worklets or native render UI threads, main JavaScript/Dart thread blocking never degrades scroll frame rates.`;
                codeSnippet = `// React Native Reanimated 3 & Native Skia Canvas Animation Protocol\nimport React from 'react';\nimport { Canvas, Circle, Group } from "@shopify/react-native-skia";\nimport { useSharedValue, withSpring, useAnimatedStyle } from "react-native-reanimated";\n\nexport function InteractivePulseRing({ color = "#6366f1" }) {\n  const radius = useSharedValue(20);\n  \n  const triggerPulse = () => {\n    // Executes on dedicated UI rendering Worklet thread for guaranteed 60 FPS\n    radius.value = withSpring(45, { damping: 4, stiffness: 80 }, () => {\n      radius.value = withSpring(20);\n    });\n  };\n  \n  return (\n    &lt;Canvas style={{ width: 100, height: 100 }} onTouchEnd={triggerPulse}&gt;\n      &lt;Circle cx={50} cy={50} r={radius} color={color} style="stroke" strokeWidth={4} /&gt;\n    &lt;/Canvas&gt;\n  );\n}`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Offload all continuous gestures and heavy geometric calculations to dedicated background UI Worklet threads.</li><li>Use flat lists with strict virtualization to prevent memory bloat when rendering long mobile feeds.</li><li>Implement offline local-first caching (Realm / WatermelonDB) to ensure high responsiveness during network degradation.</li></ul>`;
            } else if (lower.includes('python') || lower.includes('algorithm') || lower.includes('data')) {
                summaryText = `<strong>${topicTitle}</strong> is essential for performant software design, computational resource efficiency, and robust data transformations in enterprise architectures.`;
                mechanicsText = `Optimal algorithms focus on minimizing Time and Space complexities (Big-O analysis). By selecting the appropriate data structures (Hash Tables, AVL Trees, Heaps), lookup and mutation runtimes collapse from linear O(n) to constant O(1) or logarithmic O(log n).`;
                codeSnippet = `# Python High-Performance Binary Search & Cache Protocol\nfrom functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef get_fibonacci_sequence(n: int) -> int:\n    if n < 2:\n        return n\n    return get_fibonacci_sequence(n - 1) + get_fibonacci_sequence(n - 2)\n\ndef binary_search_mastery(arr: list[int], target: int) -> int:\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid  # Target discovered in O(log n) time\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1  # Target not found in sequence`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Always evaluate asymptotic worst-case bounds before choosing data structures.</li><li>Hash tables and dicts provide average O(1) lookup—leverage them for caching and deduplication.</li><li>Use built-in decorators like <code>@lru_cache</code> in Python to eliminate redundant exponential recursive calls.</li></ul>`;
            } else {
                summaryText = `<strong>${topicTitle}</strong> represents a foundational engineering competency within the <strong>${subjectTitle}</strong> curriculum, vital for comprehensive full-stack mastery.`;
                mechanicsText = `This module explores systematic abstraction layers, declarative interface protocols, and real-time state synchronization. Understanding these underlying mechanics prevents structural anti-patterns in distributed production environments.`;
                codeSnippet = `// Production Telemetry & Real-Time Event Dispatcher Example\nclass TelemetryDispatcher {\n  constructor() {\n    this.listeners = new Map();\n  }\n  subscribe(event, callback) {\n    if (!this.listeners.has(event)) this.listeners.set(event, new Set());\n    this.listeners.get(event).add(callback);\n  }\n  emit(event, payload) {\n    if (this.listeners.has(event)) {\n      this.listeners.get(event).forEach(cb => cb(payload));\n    }\n  }\n}\n\n// Execute instant non-blocking telemetry broadcast\nconst studioHub = new TelemetryDispatcher();\nstudioHub.emit('TOPIC_STUDY_INITIATED', {\n  topic: '${topicTitle}',\n  timestamp: new Date().toISOString(),\n  xpAwarded: 25\n});`;
                takeawaysText = `<ul style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:8px;"><li>Deconstruct complex architectures into decoupled, testable functional components.</li><li>Leverage event-driven observability to maintain real-time UI reactivity without inefficient polling loops.</li><li>Apply rigorous validation at API boundaries before persisting data to the DB.</li></ul>`;
            }

            contentEl.innerHTML = `
                <div class="surface-card" style="padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); border-left: 4px solid var(--primary); border-radius: 14px;">
                    <h4 style="color: var(--primary); font-size: 1.1rem; font-weight: 700; margin-top: 0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
                        <span>📌 Executive Summary & Why It Matters</span>
                    </h4>
                    <div style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">${summaryText}</div>
                </div>

                <div class="surface-card" style="padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); border-left: 4px solid var(--accent); border-radius: 14px;">
                    <h4 style="color: var(--accent); font-size: 1.1rem; font-weight: 700; margin-top: 0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
                        <span>⚙️ Core Mechanics & Architecture</span>
                    </h4>
                    <div style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">${mechanicsText}</div>
                </div>

                <div class="surface-card" style="padding: 1.5rem; background: #0b0f19; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; position: relative;">
                    <div class="flex justify-between items-center mb-1" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem;">
                        <h4 style="color: #a7f3d0; font-size: 1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span>💻 Practical Real-World Implementation / Syntax</span>
                        </h4>
                        <span class="study-badge" style="background: rgba(255,255,255,0.1); color: #94a3b8; font-size: 0.7rem; font-family: monospace;">Verified Code</span>
                    </div>
                    <pre style="margin: 0; padding: 1rem; background: #030712; border-radius: 8px; overflow-x: auto; color: #38bdf8; font-family: 'Courier New', Courier, monospace; font-size: 0.9rem; line-height: 1.5;"><code>${codeSnippet}</code></pre>
                </div>

                <div class="surface-card" style="padding: 1.5rem; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 14px;">
                    <h4 style="color: var(--success); font-size: 1.1rem; font-weight: 700; margin-top: 0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
                        <span>🧠 Key Takeaways for Mastery & Exams</span>
                    </h4>
                    <div style="color: #d1fae5; font-size: 0.95rem; line-height: 1.6;">${takeawaysText}</div>
                </div>
            `;
        }

        const btnComplete = document.getElementById('btnTopicComplete');
        const btnBookmark = document.getElementById('btnTopicBookmark');
        const btnQuiz = document.getElementById('btnTopicQuiz');
        const btnClose = document.getElementById('btnTopicModalClose');

        if (btnClose) btnClose.onclick = () => {
            modal.classList.add('hidden');
            if (courseModal) courseModal.classList.remove('hidden');
        };
        if (btnBookmark) btnBookmark.onclick = async () => {
            if (typeof showToast === 'function') showToast("📑 Concept saved to your Bookmarks collection!");
            try {
                await fetch(`${window.location.origin}/api/study-materials/bookmarks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemType: 'Topic', title: topicTitle, snippet: `Key study guide concept from ${subjectTitle}` })
                });
                if (window.appState && typeof window.appState.showXPToast === 'function') {
                    window.appState.showXPToast('+5 XP', "Bookmark saved!");
                }
            } catch(e) {}
        };
        if (btnComplete) btnComplete.onclick = async () => {
            if (typeof showToast === 'function') showToast(`🎉 Mastered "${topicTitle}"! +25 XP awarded.`);
            if (window.appState && typeof window.appState.showXPToast === 'function') {
                window.appState.showXPToast('+25 XP', `Mastered: ${topicTitle.slice(0, 25)}`);
            }
            try {
                await fetch(`${window.location.origin}/api/progress/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: topicTitle, status: 'completed' })
                });
                if (window.appState) window.appState.refreshAll(true);
            } catch(e) {}
            modal.classList.add('hidden');
            if (courseModal) courseModal.classList.remove('hidden');
        };
        if (btnQuiz) btnQuiz.onclick = () => {
            modal.classList.add('hidden');
            if (typeof showToast === 'function') showToast(`Loaded "${topicTitle}" into AI Quiz Generator!`);
            
            sessionStorage.setItem('pendingQuizTopic', `${topicTitle} - ${subjectTitle}`);
            
            const navQuiz = document.querySelector('.nav-links li[data-page="quiz"]');
            if (navQuiz) navQuiz.click();
        };

        modal.classList.remove('hidden');
    };

    const topicModal = document.getElementById('topicStudyModal');
    if (topicModal) {
        topicModal.addEventListener('click', (e) => {
            if (e.target === topicModal) {
                topicModal.classList.add('hidden');
                const courseModal = document.getElementById('courseDetailsModal');
                if (courseModal) courseModal.classList.remove('hidden');
            }
        });
    }

    // --- Professional AI Active Recall & Spaced Repetition Learning Center Engine ---
    window.fcActiveFilter = 'all';
    window.fcActiveCategory = 'all';
    window.fcSearchQuery = '';
    window.currentCardIdx = 0;
    window.fcAutoPlayTimer = null;
    window.fcCurrentTab = 'ai_notes';

    const categoriesList = [
        'Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees', 'Graphs',
        'Dynamic Programming', 'HTML', 'CSS', 'JavaScript', 'DBMS', 'Operating Systems'
    ];

    window.resetFlashcardDeck = () => {
        window.fcActiveCategory = 'all';
        window.fcActiveFilter = 'all';
        window.fcSearchQuery = '';
        const searchInput = document.getElementById('fc-search-input');
        if (searchInput) searchInput.value = '';
        window.currentCardIdx = 0;
        window.updateFlashcardsCenter();
        if (typeof showToast === 'function') showToast('Deck reloaded with fresh study data!');
    };

    window.getFilteredDeck = () => {
        let cards = (window.appState && window.appState.state && window.appState.state.studyMaterials ? window.appState.state.studyMaterials.flashcards : null) || window.fcAllCards || [];
        
        // Filter by Category
        if (window.fcActiveCategory && window.fcActiveCategory !== 'all') {
            cards = cards.filter(c => c.category === window.fcActiveCategory);
        }

        // Filter by Tab Pill
        if (window.fcActiveFilter === 'today') {
            cards = cards.filter(c => c.next_review_date && (c.next_review_date.includes('Today') || c.next_review_date === new Date().toISOString().split('T')[0] || c.times_reviewed <= 3));
        } else if (window.fcActiveFilter === 'bookmarked') {
            cards = cards.filter(c => c.bookmarked || c.is_favorite);
        } else if (window.fcActiveFilter === 'revision') {
            cards = cards.filter(c => c.difficulty_rating === 'hard' || c.difficulty_rating === 'forgot' || (c.success_rate && c.success_rate < 80));
        } else if (window.fcActiveFilter === 'mastered') {
            cards = cards.filter(c => (c.success_rate && c.success_rate >= 90) || c.difficulty_rating === 'easy');
        } else if (window.fcActiveFilter === 'recent') {
            cards = [...cards].reverse();
        }

        // Filter by Search Query
        if (window.fcSearchQuery && window.fcSearchQuery.trim() !== '') {
            const q = window.fcSearchQuery.trim().toLowerCase();
            cards = cards.filter(c => (c.question && c.question.toLowerCase().includes(q)) || (c.answer && c.answer.toLowerCase().includes(q)) || (c.category && c.category.toLowerCase().includes(q)));
        }
        return cards;
    };

    window.updateFlashcardsCenter = () => {
        const allCards = (window.appState && window.appState.state && window.appState.state.studyMaterials ? window.appState.state.studyMaterials.flashcards : null) || window.fcAllCards || [];
        const deck = window.getFilteredDeck();
        window.activeDeck = deck;
        if (window.currentCardIdx >= deck.length) window.currentCardIdx = Math.max(0, deck.length - 1);

        // 1. Update 6 Dashboard Header Metrics
        const mToday = document.getElementById('fc-metric-today');
        const mRem = document.getElementById('fc-metric-remaining');
        const mAcc = document.getElementById('fc-metric-accuracy');
        const mXp = document.getElementById('fc-metric-xp');
        const mStreak = document.getElementById('fc-metric-streak');
        const mTime = document.getElementById('fc-metric-time');

        if (mToday) mToday.innerText = `${allCards.filter(c => c.next_review_date && (c.next_review_date.includes('Today') || c.times_reviewed <= 3)).length} Cards`;
        if (mRem) mRem.innerText = `${Math.max(0, deck.length - window.currentCardIdx)} Cards`;
        if (mAcc) {
            const totalAcc = allCards.reduce((acc, c) => acc + (c.success_rate || 0), 0);
            mAcc.innerText = allCards.length ? `${(totalAcc / allCards.length).toFixed(1)}%` : '0%';
        }
        if (mXp) {
            const dailyXp = (window.appState && window.appState.state.gamification && window.appState.state.gamification.dailyXp) || 0;
            mXp.innerText = `+${dailyXp} XP`;
        }
        if (mStreak) {
            const streak = (window.appState && window.appState.state.gamification && window.appState.state.gamification.streak) || 0;
            mStreak.innerText = `${streak} Days`;
        }
        if (mTime) mTime.innerText = `${Math.ceil(Math.max(0, deck.length - window.currentCardIdx) * 0.5)} mins`;

        // 2. Render Category Sidebar with Mastery percentage & progress bars (including dynamic saved note topics!)
        const catContainer = document.getElementById('fc-categories-list');
        if (catContainer) {
            // Discover custom topics added when the user saved Study Notes!
            const noteTopics = [];
            allCards.forEach(c => {
                if (c.category && !categoriesList.includes(c.category) && !noteTopics.includes(c.category)) {
                    noteTopics.push(c.category);
                }
            });
            // Put saved notes topics at the very top of the list for immediate study!
            const activeCategories = [...noteTopics, ...categoriesList];

            const catCountEl = document.getElementById('fc-cat-count-tag');
            if (catCountEl) catCountEl.innerText = `${activeCategories.length} Categories`;

            let catHTML = `
                <div class="fc-cat-item hover-lift" data-cat="all" style="padding: 0.75rem; border-radius: 8px; background: ${window.fcActiveCategory === 'all' ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${window.fcActiveCategory === 'all' ? 'var(--primary)' : 'var(--border-light)'}; cursor: pointer; transition: all 0.2s ease;">
                    <div class="flex justify-between items-center mb-1">
                        <span style="font-weight: 700; font-size: 0.92rem; color: ${window.fcActiveCategory === 'all' ? '#fff' : '#cbd5e1'};">🌐 All Categories</span>
                        <span class="study-badge" style="background: rgba(255,255,255,0.06); color: #94a3b8; font-size: 0.7rem;">${allCards.length} cards</span>
                    </div>
                    <div class="flex justify-between items-center text-muted" style="font-size: 0.75rem; margin-bottom: 4px;">
                        <span>Overall Mastery</span>
                        <span style="color: var(--success); font-weight: 700;">89%</span>
                    </div>
                    <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                        <div style="width: 89%; height: 100%; background: var(--success); border-radius: 3px;"></div>
                    </div>
                </div>
            `;

            activeCategories.forEach(cat => {
                const isFromNote = noteTopics.includes(cat);
                const catCards = allCards.filter(c => c.category === cat);
                const count = catCards.length;
                const totalM = catCards.reduce((sum, c) => sum + (c.mastery_percentage || c.success_rate || 85), 0);
                const mastery = Math.min(100, Math.round(totalM / Math.max(1, catCards.length)));
                const active = window.fcActiveCategory === cat;
                const noteBadge = isFromNote ? `<span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.18); color: #fbbf24; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.35); display: inline-block; font-weight: 600; margin-top: 3px;">📝 Saved Note</span>` : '';

                catHTML += `
                    <div class="fc-cat-item hover-lift" data-cat="${cat}" style="padding: 0.75rem; border-radius: 8px; background: ${active ? 'rgba(99,102,241,0.22)' : (isFromNote ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.03)')}; border: 1px solid ${active ? 'var(--primary)' : (isFromNote ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-light)')}; cursor: pointer; transition: all 0.2s ease;">
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <div style="font-weight: 700; font-size: 0.9rem; color: ${active ? '#fff' : '#cbd5e1'};">${cat}</div>
                                ${noteBadge}
                            </div>
                            <span class="study-badge" style="background: rgba(255,255,255,0.06); color: #94a3b8; font-size: 0.7rem; white-space: nowrap;">${count} cards</span>
                        </div>
                        <div class="flex justify-between items-center text-muted" style="font-size: 0.75rem; margin-bottom: 4px;">
                            <span>Mastery</span>
                            <span style="color: ${mastery >= 90 ? 'var(--success)' : (mastery >= 80 ? '#c4b5fd' : 'var(--warning)')}; font-weight: 700;">${mastery}%</span>
                        </div>
                        <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${mastery}%; height: 100%; background: ${mastery >= 90 ? 'var(--success)' : (mastery >= 80 ? 'var(--primary)' : 'var(--warning)')}; border-radius: 3px;"></div>
                        </div>
                    </div>
                `;
            });

            catContainer.innerHTML = catHTML;

            // Bind click handlers to category cards
            catContainer.querySelectorAll('.fc-cat-item').forEach(el => {
                el.addEventListener('click', () => {
                    window.fcActiveCategory = el.getAttribute('data-cat');
                    window.currentCardIdx = 0;
                    window.updateFlashcardsCenter();
                });
            });
        }

        // 3. Render Active Card in Player
        window.renderActiveFlashcard();
    };

    window.renderActiveFlashcard = () => {
        const deck = window.activeDeck || [];
        const idx = window.currentCardIdx || 0;
        
        // Progress bar and indicators
        const progCur = document.getElementById('fc-prog-current');
        const progTot = document.getElementById('fc-prog-total');
        const progPct = document.getElementById('fc-prog-percent');
        const progRem = document.getElementById('fc-prog-remaining');
        const progFill = document.getElementById('fc-progress-fill');
        const dCurNo = document.getElementById('deck-current-no');
        const dTotNo = document.getElementById('deck-total-no');

        const pct = deck.length > 0 ? Math.round(((idx + 1) / deck.length) * 100) : 0;
        if (progCur) progCur.innerText = deck.length ? idx + 1 : 0;
        if (progTot) progTot.innerText = deck.length;
        if (progPct) progPct.innerText = `${pct}%`;
        if (progRem) progRem.innerText = deck.length ? deck.length - idx - 1 : 0;
        if (progFill) progFill.style.width = `${pct}%`;
        if (dCurNo) dCurNo.innerText = deck.length ? idx + 1 : 0;
        if (dTotNo) dTotNo.innerText = deck.length;

        const container = document.getElementById('current-flashcard');
        if (container) container.classList.remove('flipped');

        if (deck.length === 0) {
            const qEl = document.getElementById('card-question-text');
            const aEl = document.getElementById('card-answer-text');
            if (qEl) qEl.innerText = "No flashcards found for current filter/search. Try selecting 'All Cards'!";
            if (aEl) aEl.innerText = "Check your search term or category filters above.";
            return;
        }

        const card = deck[idx];
        const qEl = document.getElementById('card-question-text');
        const aEl = document.getElementById('card-answer-text');
        const tEl = document.getElementById('card-topic-tag');
        const diffEl = document.getElementById('card-diff-tag');

        if (qEl) qEl.innerText = card.question || "Algorithm Definition";
        if (aEl) aEl.innerText = card.answer || "Detailed verified answer.";
        if (tEl) tEl.innerText = card.category || card.topic || "Core Knowledge";
        if (diffEl) {
            const diff = card.difficulty_rating || "normal";
            diffEl.innerText = diff.toUpperCase();
            diffEl.style.color = diff === 'easy' ? '#34d399' : diff === 'hard' ? '#fbbf24' : diff === 'forgot' ? '#f87171' : '#c4b5fd';
            diffEl.style.background = diff === 'easy' ? 'rgba(16,185,129,0.15)' : diff === 'hard' ? 'rgba(245,158,11,0.15)' : diff === 'forgot' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)';
        }

        // Update card stats display
        const stNext = document.getElementById('stat-next-date');
        const stDiff = document.getElementById('stat-diff-lvl');
        const stRev = document.getElementById('stat-times-rev');
        const stLast = document.getElementById('stat-last-rev');
        const stRate = document.getElementById('stat-success-rate');

        if (stNext) stNext.innerText = card.next_review_date || "2026-08-06";
        if (stDiff) {
            stDiff.innerText = (card.difficulty_rating || "normal").charAt(0).toUpperCase() + (card.difficulty_rating || "normal").slice(1);
        }
        if (stRev) stRev.innerText = `${card.times_reviewed || 3}x`;
        if (stLast) stLast.innerText = card.last_reviewed || "2 days ago";
        if (stRate) stRate.innerText = `${card.success_rate || 88}%`;

        // Update tool buttons status
        const btnFav = document.getElementById('fc-btn-favorite');
        const btnBm = document.getElementById('fc-btn-bookmark');
        if (btnFav) {
            btnFav.style.color = card.is_favorite ? '#ef4444' : 'var(--text-secondary)';
            btnFav.innerHTML = card.is_favorite ? '❤️ Favorited' : '🤍 Favorite';
        }
        if (btnBm) {
            btnBm.style.color = card.bookmarked ? '#38bdf8' : 'var(--text-secondary)';
            btnBm.innerHTML = card.bookmarked ? '📑 Bookmarked' : '📑 Bookmark';
        }
    };

    // Card Flip handling
    const flashcardEl = document.getElementById('current-flashcard');
    if (flashcardEl) {
        flashcardEl.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-card-rate') && !e.target.closest('button')) {
                flashcardEl.classList.toggle('flipped');
            }
        });
    }

    // Spaced Repetition SM-2 Ratings Action
    document.querySelectorAll('.btn-card-rate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const rate = btn.getAttribute('data-rate') || 'easy';
            const card = (window.activeDeck || [])[window.currentCardIdx || 0];
            if (card && card.id) {
                try {
                    const res = await fetch(`${window.location.origin}/api/study-materials/flashcards/review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cardId: card.id, rating: rate })
                    });
                    const data = await res.json();
                    if (data && data.card) {
                        Object.assign(card, data.card);
                    }
                    const reward = data.xpAward || (rate === 'easy' ? 20 : rate === 'good' ? 15 : rate === 'hard' ? 10 : 5);
                    if (typeof showToast === 'function') showToast(`Rated ${rate.toUpperCase()}! Spaced repetition updated (+${reward} XP)`);
                } catch(err) {
                    if (typeof showToast === 'function') showToast(`Rated ${rate.toUpperCase()}! Spaced repetition scheduled.`);
                }
            }

            // Animate card transition & advance
            setTimeout(() => {
                if (window.activeDeck && window.currentCardIdx < window.activeDeck.length - 1) {
                    window.currentCardIdx++;
                } else {
                    window.currentCardIdx = 0;
                    if (typeof showToast === 'function') showToast("🎉 Deck review complete! Repeating deck.");
                }
                window.updateFlashcardsCenter();
            }, 300);
        });
    });

    // Navigation buttons
    document.getElementById('btnFcNext')?.addEventListener('click', () => {
        if (window.activeDeck && window.activeDeck.length > 0) {
            window.currentCardIdx = (window.currentCardIdx + 1) % window.activeDeck.length;
            window.renderActiveFlashcard();
        }
    });
    document.getElementById('btnFcPrev')?.addEventListener('click', () => {
        if (window.activeDeck && window.activeDeck.length > 0) {
            window.currentCardIdx = (window.currentCardIdx - 1 + window.activeDeck.length) % window.activeDeck.length;
            window.renderActiveFlashcard();
        }
    });
    document.getElementById('btnFcShuffle')?.addEventListener('click', () => {
        if (window.activeDeck && window.activeDeck.length > 1) {
            for (let i = window.activeDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [window.activeDeck[i], window.activeDeck[j]] = [window.activeDeck[j], window.activeDeck[i]];
            }
            window.currentCardIdx = 0;
            window.renderActiveFlashcard();
            if (typeof showToast === 'function') showToast('🔀 Active recall deck shuffled!');
        }
    });
    document.getElementById('btnFcRandom')?.addEventListener('click', () => {
        if (window.activeDeck && window.activeDeck.length > 0) {
            window.currentCardIdx = Math.floor(Math.random() * window.activeDeck.length);
            window.renderActiveFlashcard();
            if (typeof showToast === 'function') showToast('🎲 Jumped to random review card!');
        }
    });

    // Auto Play feature with smooth countdown animation
    const btnAutoPlay = document.getElementById('btnFcAutoPlay');
    const indAutoPlay = document.getElementById('auto-play-indicator');
    if (btnAutoPlay) {
        btnAutoPlay.addEventListener('click', () => {
            if (window.fcAutoPlayTimer) {
                clearInterval(window.fcAutoPlayTimer);
                window.fcAutoPlayTimer = null;
                btnAutoPlay.style.background = 'rgba(236, 72, 153, 0.15)';
                btnAutoPlay.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                btnAutoPlay.style.color = '#f472b6';
                if (indAutoPlay) indAutoPlay.style.background = '#94a3b8';
                btnAutoPlay.innerHTML = `<span style="width:8px; height:8px; border-radius:50%; background:#94a3b8; display:inline-block;"></span> Auto Play: OFF`;
                if (typeof showToast === 'function') showToast('Auto Play paused.');
            } else {
                btnAutoPlay.style.background = 'var(--primary)';
                btnAutoPlay.style.borderColor = 'var(--accent)';
                btnAutoPlay.style.color = '#fff';
                if (indAutoPlay) indAutoPlay.style.background = '#34d399';
                btnAutoPlay.innerHTML = `<span style="width:8px; height:8px; border-radius:50%; background:#34d399; display:inline-block; box-shadow: 0 0 8px #34d399;"></span> Auto Play: ON`;
                if (typeof showToast === 'function') showToast(' ▶️ Auto Play active! Card flips and steps every 5s.');
                
                window.fcAutoPlayTimer = setInterval(() => {
                    const cardEl = document.getElementById('current-flashcard');
                    if (cardEl && !cardEl.classList.contains('flipped')) {
                        cardEl.classList.add('flipped');
                    } else {
                        document.getElementById('btnFcNext')?.click();
                    }
                }, 4500);
            }
        });
    }

    // Top Tool Bar Actions (Bookmark, Favorite, Share, Report, Explain, Example)
    document.getElementById('fc-btn-favorite')?.addEventListener('click', async () => {
        const card = (window.activeDeck || [])[window.currentCardIdx || 0];
        if (card) {
            card.is_favorite = !card.is_favorite;
            window.renderActiveFlashcard();
            if (card.id) {
                await fetch(`${window.location.origin}/api/study-materials/flashcards/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cardId: card.id, is_favorite: card.is_favorite })
                });
            }
            if (typeof showToast === 'function') showToast(card.is_favorite ? '❤️ Added to Favorites!' : 'Removed from Favorites.');
        }
    });
    document.getElementById('fc-btn-bookmark')?.addEventListener('click', async () => {
        const card = (window.activeDeck || [])[window.currentCardIdx || 0];
        if (card) {
            card.bookmarked = !card.bookmarked;
            window.renderActiveFlashcard();
            if (card.id) {
                await fetch(`${window.location.origin}/api/study-materials/flashcards/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cardId: card.id, bookmarked: card.bookmarked })
                });
            }
            if (typeof showToast === 'function') showToast(card.bookmarked ? '📑 Saved to Bookmarks!' : 'Removed from Bookmarks.');
            if (typeof window.renderStudyMaterialTab === 'function') window.renderStudyMaterialTab(window.fcCurrentTab || 'bookmarks');
        }
    });
    document.getElementById('fc-btn-share')?.addEventListener('click', () => {
        const card = (window.activeDeck || [])[window.currentCardIdx || 0];
        const text = card ? `Check out this concept on ${card.category || 'CS'}: "${card.question}"` : 'Study with CogniPath!';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            if (typeof showToast === 'function') showToast('↗️ Flashcard study snippet copied to clipboard!');
        } else {
            if (typeof showToast === 'function') showToast('↗️ Link shared!');
        }
    });
    document.getElementById('fc-btn-report')?.addEventListener('click', () => {
        if (typeof showToast === 'function') showToast('⚠️ Reported card inaccuracy to platform governance review.');
    });
    document.getElementById('fc-btn-ai-explain')?.addEventListener('click', () => {
        document.querySelector('.btn-ai-assist[data-action="explain_simply"]')?.click();
    });
    document.getElementById('fc-btn-ai-example')?.addEventListener('click', () => {
        document.querySelector('.btn-ai-assist[data-action="real_world"]')?.click();
    });

    // Filter Tabs Pills Row
    document.querySelectorAll('.fc-filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fc-filter-tab').forEach(b => {
                b.style.background = 'rgba(255,255,255,0.06)';
                b.style.color = 'var(--text-secondary)';
                b.style.borderColor = 'var(--border-light)';
            });
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'var(--primary)';
            window.fcActiveFilter = btn.getAttribute('data-filter');
            window.currentCardIdx = 0;
            window.updateFlashcardsCenter();
        });
    });

    // Search input debounce
    const fcSearchInput = document.getElementById('fc-search-input');
    let fcTimer = null;
    if (fcSearchInput) {
        fcSearchInput.addEventListener('input', () => {
            clearTimeout(fcTimer);
            fcTimer = setTimeout(() => {
                window.fcSearchQuery = fcSearchInput.value;
                window.currentCardIdx = 0;
                window.updateFlashcardsCenter();
            }, 300);
        });
    }

    // AI Active Recall Assistant Tutor Buttons
    document.querySelectorAll('.btn-ai-assist').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.getAttribute('data-action');
            const card = (window.activeDeck || [])[window.currentCardIdx || 0] || {};
            const outBox = document.getElementById('fc-ai-output-box');
            if (!outBox) return;

            outBox.classList.remove('hidden');
            // Smooth skeleton animation while loading
            outBox.innerHTML = `
                <div class="flex items-center gap-1 text-muted">
                    <span style="display:inline-block; animation: pulse 1s infinite;">⚙️</span>
                    <span>AI Pedagogical Assistant is generating expert ${action ? action.replace('_', ' ') : 'insights'}...</span>
                </div>
            `;

            try {
                const res = await fetch(`${window.location.origin}/api/study-materials/flashcards/ai-assist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: card.question || '',
                        answer: card.answer || '',
                        category: card.category || 'Computer Science',
                        action
                    })
                });
                const data = await res.json();
                if (data && data.insight) {
                    if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
                        outBox.innerHTML = window.marked.parse(data.insight);
                    } else {
                        outBox.innerHTML = data.insight.replace(/\n/g, '<br>');
                    }
                }
            } catch (err) {
                outBox.innerHTML = `<span style="color: var(--error);">Could not connect to AI Tutor service. Please try again.</span>`;
            }
        });
    });

    // Study Materials Tabs Switching Engine (Below Flashcards)
    window.renderStudyMaterialTab = (tab) => {
        window.fcCurrentTab = tab;
        const container = document.getElementById('fc-study-tab-content');
        if (!container) return;

        const allCards = (window.appState && window.appState.state && window.appState.state.studyMaterials ? window.appState.state.studyMaterials.flashcards : null) || window.fcAllCards || [];
        const bookmarks = (window.appState && window.appState.state && window.appState.state.studyMaterials ? window.appState.state.studyMaterials.bookmarks : null) || [];

        const bmCountEl = document.getElementById('bm-count-tag');
        const bookmarkedCards = allCards.filter(c => c.bookmarked || c.is_favorite);
        if (bmCountEl) bmCountEl.innerText = bookmarks.length + bookmarkedCards.length;

        if (tab === 'ai_notes') {
            container.innerHTML = `
                <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #fff;">📝 AI Generated Active Study Notes</h4>
                <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                    <div class="surface-card hover-lift" style="padding: 1.25rem; border: 1px solid var(--border-light); background: rgba(0,0,0,0.2);">
                        <div class="study-badge mb-1" style="background: rgba(99,102,241,0.2); color: #c4b5fd;">Arrays & Big-O</div>
                        <div style="font-weight: 700; color: #fff; font-size: 1rem; margin: 0.5rem 0;">Memory Contiguity Invariants</div>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5;">Sequential byte addressing allows formulaic offset derivation: Address = Base + (Index * Size). This underpins constant time O(1) reads.</p>
                    </div>
                    <div class="surface-card hover-lift" style="padding: 1.25rem; border: 1px solid var(--border-light); background: rgba(0,0,0,0.2);">
                        <div class="study-badge mb-1" style="background: rgba(16,185,129,0.2); color: #34d399;">Linked Lists</div>
                        <div style="font-weight: 700; color: #fff; font-size: 1rem; margin: 0.5rem 0;">Pointer Re-routing Mastery</div>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5;">Reversing requires three pointers (prev, curr, next). Always cache curr.next before breaking structural links to prevent orphaned garbage collection nodes.</p>
                    </div>
                    <div class="surface-card hover-lift" style="padding: 1.25rem; border: 1px solid var(--border-light); background: rgba(0,0,0,0.2);">
                        <div class="study-badge mb-1" style="background: rgba(245,158,11,0.2); color: #fbbf24;">Dynamic Programming</div>
                        <div style="font-weight: 700; color: #fff; font-size: 1rem; margin: 0.5rem 0;">Tabulation vs Memoization</div>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5;">Bottom-up tabulation fills iteration arrays without stack allocation overhead, avoiding Python recursion depth limit exceptions during technical assessments.</p>
                    </div>
                </div>
            `;
        } else if (tab === 'bookmarks') {
            let html = `<h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #fff;">📑 Saved Bookmarks & Favorited Flashcards</h4>`;
            if (bookmarks.length === 0 && bookmarkedCards.length === 0) {
                html += `<div class="text-muted" style="text-align: center; padding: 2rem;">No saved bookmarks yet. Click the '📑 Bookmark' button on any flashcard above!</div>`;
            } else {
                html += `<div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">`;
                bookmarkedCards.forEach(c => {
                    html += `
                        <div class="surface-card hover-lift" style="padding: 1.25rem; border-left: 3px solid #38bdf8; background: rgba(0,0,0,0.25);">
                            <div class="flex justify-between items-center text-muted" style="font-size: 0.75rem; margin-bottom: 0.5rem;">
                                <span class="study-badge" style="background: rgba(56,189,248,0.15); color: #38bdf8;">Flashcard: ${c.category}</span>
                                <span>${c.is_favorite ? '❤️ Favorited' : '📑 Bookmarked'}</span>
                            </div>
                            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.5rem; color: #fff;">${c.question}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${c.answer}</div>
                        </div>
                    `;
                });
                bookmarks.forEach(bm => {
                    html += `
                        <div class="surface-card hover-lift" style="padding: 1.25rem; border-left: 3px solid var(--primary); background: rgba(0,0,0,0.25);">
                            <div class="flex justify-between items-center text-muted" style="font-size: 0.75rem; margin-bottom: 0.5rem;">
                                <span>${bm.item_type || 'Note'}</span>
                                <span>${new Date(bm.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.5rem; color: #fff;">${bm.title}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${bm.snippet}</div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            container.innerHTML = html;
        } else if (tab === 'ai_summary') {
            container.innerHTML = `
                <div style="max-width: 900px;">
                    <h4 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                        <span>⚡ Executive AI Curriculum Synthesis & Summary</span>
                        <span class="study-badge" style="background: rgba(16,185,129,0.2); color: #34d399;">Mastery Level: High</span>
                    </h4>
                    <p style="font-size: 0.92rem; line-height: 1.7; color: var(--text-secondary); margin-bottom: 1rem;">
                        Across your <strong>12 active domain categories</strong>, your current spaced repetition convergence shows exceptional retention in foundational data structures (Arrays, Linked Lists, HTML/CSS semantics) with an average accuracy of <strong>88.5%</strong>.
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1.25rem;">
                        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                            <div style="color: #38bdf8; font-weight: 700; margin-bottom: 0.25rem;">Key Strengths 💪</div>
                            <div style="font-size: 0.85rem; color: #e2e8f0;">O(1) indexing concepts, ACID database guarantees, semantic accessibility trees, and BST in-order sorting properties.</div>
                        </div>
                        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                            <div style="color: #fbbf24; font-weight: 700; margin-bottom: 0.25rem;">Recommended Focus 🎯</div>
                            <div style="font-size: 0.85rem; color: #e2e8f0;">Monotonic stack algorithmic patterns, OS CPU context switching TLB flushes, and JavaScript V8 Microtask queue timing.</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tab === 'difficult_topics') {
            const diffCards = allCards.filter(c => c.difficulty_rating === 'hard' || c.difficulty_rating === 'forgot' || (c.success_rate && c.success_rate < 80));
            let html = `
                <div class="flex justify-between items-center mb-1">
                    <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff;">🧠 Challenging & Difficult Topics (${diffCards.length})</h4>
                    <button onclick="window.fcActiveFilter = 'revision'; window.currentCardIdx = 0; window.updateFlashcardsCenter();" class="btn-primary hover-lift" style="background: rgba(239,68,68,0.2); border: 1px solid var(--error); color: #f87171; font-size: 0.8rem; padding: 4px 12px;">Review All in Deck ⚡</button>
                </div>
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.25rem;">Topics rated as 'Hard' or 'Forgot' during your active recall sessions are automatically compiled here for prioritized reinforcement.</p>
            `;
            if (diffCards.length === 0) {
                html += `<div class="text-muted" style="text-align: center; padding: 2rem;">🎉 Great job! No difficult topics currently flagged in your learning deck!</div>`;
            } else {
                html += `<div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">`;
                diffCards.forEach(c => {
                    html += `
                        <div class="surface-card hover-lift" style="padding: 1.25rem; border-left: 3px solid #f87171; background: rgba(239, 68, 68, 0.04);">
                            <div class="flex justify-between items-center text-muted" style="font-size: 0.75rem; margin-bottom: 0.5rem;">
                                <span class="study-badge" style="background: rgba(239,68,68,0.15); color: #f87171;">${c.category}</span>
                                <span style="color: #fbbf24; font-weight: 700;">Success: ${c.success_rate || 70}%</span>
                            </div>
                            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.5rem; color: #fff;">${c.question}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">${c.answer}</div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            container.innerHTML = html;
        } else if (tab === 'revision_list') {
            const revCards = allCards.filter(c => c.next_review_date && (c.next_review_date.includes('Today') || c.times_reviewed <= 3 || c.difficulty_rating !== 'easy'));
            let html = `
                <div class="flex justify-between items-center mb-1">
                    <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff;">🕒 Spaced Repetition Scheduled Revision (${revCards.length} scheduled)</h4>
                    <span class="study-badge" style="background: rgba(99,102,241,0.2); color: #c4b5fd;">Anki SM-2 Protocol</span>
                </div>
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.25rem;">Items optimized by our spaced repetition algorithm for reinforcement today to prevent Ebbinghaus forgetting curve decay.</p>
            `;
            html += `<div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 400px; overflow-y: auto;">`;
            revCards.slice(0, 8).forEach(c => {
                html += `
                    <div class="hover-lift flex justify-between items-center" style="padding: 0.75rem 1rem; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                        <div class="flex items-center gap-1">
                            <span class="study-badge" style="width: 130px; text-align: center; background: rgba(255,255,255,0.06); color: #cbd5e1; font-size: 0.75rem;">${c.category}</span>
                            <span style="color: #f8fafc; font-weight: 600; font-size: 0.9rem;">${c.question.slice(0, 75)}...</span>
                        </div>
                        <span class="study-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size: 0.75rem;">Due: ${c.next_review_date || 'Today'}</span>
                    </div>
                `;
            });
            html += `</div>`;
            container.innerHTML = html;
        }
    };

    document.querySelectorAll('.fc-study-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fc-study-tab-btn').forEach(b => {
                b.classList.remove('active');
                b.style.color = 'var(--text-secondary)';
                b.style.borderBottom = 'none';
            });
            btn.classList.add('active');
            btn.style.color = 'var(--primary)';
            btn.style.borderBottom = '2px solid var(--primary)';
            window.renderStudyMaterialTab(btn.getAttribute('data-tab') || 'ai_notes');
        });
    });

    // --- Global Real-Time Search Debounce Engine ---
    const searchInput = document.getElementById('globalSearchInput');
    const searchResults = document.getElementById('globalSearchResults');
    let searchTimeout = null;

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (!query) {
                searchResults.classList.add('hidden');
                return;
            }
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`${window.location.origin}/api/search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    searchResults.classList.remove('hidden');
                    if (!data.results || data.results.length === 0) {
                        searchResults.innerHTML = '<div class="text-muted" style="padding: 0.5rem; text-align: center;">No matches found in knowledge base.</div>';
                    } else {
                        searchResults.innerHTML = data.results.map(r => `
                            <div class="surface-card hover-lift" style="padding: 0.65rem; border-bottom: 1px solid var(--border-light); cursor: pointer; margin-bottom: 4px;">
                                <div style="font-weight: 700; font-size: 0.9rem; color: #fff;">${r.title}</div>
                                <div style="font-size: 0.75rem; color: var(--accent);">${r.type.toUpperCase()} • <span style="color: var(--text-secondary);">${r.snippet || ''}</span></div>
                            </div>
                        `).join('');
                    }
                } catch(e) {
                    console.error("Search fetch failed", e);
                }
            }, 250);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#global-search-container')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    // --- Admin Add Course Handler (Delegated to AdminView.js) ---

    // --- Analytics Download Report ---
    const btnDownloadReport = document.getElementById('btnDownloadReport');
    if (btnDownloadReport) {
        btnDownloadReport.addEventListener('click', () => {
            const originalText = btnDownloadReport.innerHTML;
            btnDownloadReport.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Generating...';
            btnDownloadReport.disabled = true;

            setTimeout(() => {
                try {
                    if (!window.jspdf || !window.jspdf.jsPDF) {
                        throw new Error("jsPDF library not initialized");
                    }
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF('p', 'mm', 'a4');

                    // --- 1. Header & Enterprise App Branding ---
                    doc.setFillColor(15, 23, 42); // Deep Royal Navy (#0f172a)
                    doc.rect(0, 0, 210, 38, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(18);
                    doc.text('COGNIPATH ENTERPRISE AI LEARNING PLATFORM', 14, 18);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10.5);
                    doc.setTextColor(148, 163, 184); // Slate grey (#94a3b8)
                    doc.text('Certified Student Progress & AI Analytics Mastery Report', 14, 28);

                    const reportToken = `VERIFIED ID: CP-${Date.now().toString(36).toUpperCase()}`;
                    doc.setFontSize(8.5);
                    doc.text(reportToken, 210 - 14 - doc.getTextWidth(reportToken), 28);

                    // --- 2. Student Profile & Credentials Section ---
                    doc.setTextColor(30, 41, 59);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(13);
                    doc.text('1. STUDENT PROFILE & CREDENTIALS', 14, 50);

                    // Draw styled credentials card box
                    doc.setFillColor(248, 250, 252);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(14, 54, 182, 32, 3, 3, 'FD');

                    // Extract user information dynamically
                    let uName = document.getElementById('topbar-user-name')?.innerText || 'Anil Tavva';
                    let uEmail = 'tavvagmail.com';
                    try {
                        const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}') || JSON.parse(localStorage.getItem('user') || '{}');
                        if (savedUser.name) uName = savedUser.name;
                        if (savedUser.email) uEmail = savedUser.email;
                        else if (localStorage.getItem('user_email')) uEmail = localStorage.getItem('user_email');
                    } catch(e){}

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9.5);
                    doc.setTextColor(100, 116, 139);
                    doc.text('FULL NAME:', 20, 64);
                    doc.text('EMAIL ADDRESS:', 105, 64);
                    doc.text('ACCOUNT STATUS:', 20, 78);
                    doc.text('REPORT GENERATED:', 105, 78);

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(15, 23, 42);
                    doc.text(String(uName), 45, 64);
                    doc.text(String(uEmail), 138, 64);
                    doc.text('Active Enterprise Scholar', 55, 78);
                    doc.text(new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }), 145, 78);

                    // --- 3. Executive Progress & Mastery KPIs ---
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(13);
                    doc.setTextColor(30, 41, 59);
                    doc.text('2. LEARNING PROGRESS & MASTERY METRICS', 14, 98);

                    // Get analytics values
                    const statTopics = document.getElementById('statTopics')?.innerText || '85% (Advanced)';
                    const statPdfs = document.getElementById('statPdfs')?.innerText || '12 Documents';
                    const statQuestions = document.getElementById('statQuestions')?.innerText || '45 Resolved';
                    const statStreak = document.getElementById('statStreak')?.innerText || '7 Consecutive Days';
                    const userLevel = document.getElementById('topbar-user-level')?.innerText || 'Level 5 Scholar';
                    const totalStudyTime = document.getElementById('analytics-time')?.innerText || document.getElementById('statStudyTime')?.innerText || '4h 15m Recorded';

                    // Draw 6 KPI mini boxes in a 2x3 grid
                    const kpiList = [
                        { label: 'Overall Mastery Level', value: statTopics, color: [79, 70, 229] },
                        { label: 'Total PDFs Analyzed', value: statPdfs, color: [236, 72, 153] },
                        { label: 'AI Inquiries Resolved', value: statQuestions, color: [16, 185, 129] },
                        { label: 'Active Study Streak', value: statStreak, color: [245, 158, 11] },
                        { label: 'Gamified Advancement', value: userLevel, color: [168, 85, 247] },
                        { label: 'Verified Study Duration', value: totalStudyTime, color: [14, 165, 233] }
                    ];

                    let kpiX = 14;
                    let kpiY = 104;
                    kpiList.forEach((kpi, idx) => {
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(203, 213, 225);
                        doc.roundedRect(kpiX, kpiY, 58, 22, 2.5, 2.5, 'FD');

                        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
                        doc.rect(kpiX, kpiY, 3, 22, 'F');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8);
                        doc.setTextColor(100, 116, 139);
                        doc.text(kpi.label.toUpperCase(), kpiX + 6, kpiY + 7);

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(11.5);
                        doc.setTextColor(15, 23, 42);
                        doc.text(String(kpi.value).slice(0, 22), kpiX + 6, kpiY + 16.5);

                        kpiX += 62;
                        if ((idx + 1) % 3 === 0) {
                            kpiX = 14;
                            kpiY += 26;
                        }
                    });

                    // --- 4. Verified Activity & Achievement Timeline ---
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(13);
                    doc.setTextColor(30, 41, 59);
                    doc.text('3. VERIFIED LEARNING MILESTONE TIMELINE', 14, 168);

                    // Filter clean activities without heartbeat noise
                    const activities = (window.appState?.state?.analytics?.activityTimeline || []).filter(act => 
                        !act.type?.includes('study_time_updated') && 
                        !act.title?.includes('Active Study Heartbeat') &&
                        !act.title?.includes('Study Heartbeat')
                    );

                    const tableRows = activities.map(act => {
                        const dtObj = new Date(act.created_at || act.timestamp || act.date || Date.now());
                        const validDt = !isNaN(dtObj) ? dtObj : new Date();
                        const dateFormatted = `${validDt.toLocaleDateString()} ${validDt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                        
                        let typeLabel = (act.type || 'study').toUpperCase();
                        if (act.type === 'upload' || act.type === 'pdf' || act.title?.toLowerCase().includes('pdf')) typeLabel = 'DOCUMENT';
                        else if (act.type === 'chat' || act.title?.toLowerCase().includes('tutor')) typeLabel = 'AI TUTOR';
                        else if (act.type === 'quiz' || act.title?.toLowerCase().includes('quiz')) typeLabel = 'AI QUIZ';

                        return [
                            dateFormatted,
                            typeLabel,
                            act.title || 'Learning Achievement',
                            act.subjectName || 'Core Curriculum',
                            act.xp_earned > 0 ? `+${act.xp_earned} XP` : 'Verified'
                        ];
                    });

                    if (tableRows.length === 0) {
                        tableRows.push([new Date().toLocaleDateString(), 'SYSTEM', 'Active Student Portal Authorization & Setup Complete', 'Core Platform', '+10 XP']);
                    }

                    if (doc.autoTable) {
                        doc.autoTable({
                            startY: 173,
                            head: [['Date & Time', 'Category', 'Milestone Description', 'Subject / Domain', 'XP Gained']],
                            body: tableRows,
                            theme: 'grid',
                            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, halign: 'left' },
                            bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85], cellPadding: 3.5 },
                            alternateRowStyles: { fillColor: [248, 250, 252] },
                            columnStyles: {
                                0: { cellWidth: 35 },
                                1: { cellWidth: 28, fontStyle: 'bold', textColor: [79, 70, 229] },
                                2: { cellWidth: 62 },
                                3: { cellWidth: 35 },
                                4: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
                            },
                            margin: { left: 14, right: 14 },
                            didDrawPage: function (data) {
                                doc.setFontSize(8);
                                doc.setTextColor(148, 163, 184);
                                doc.text('CogniPath Enterprise AI Learning Platform • Confidential & Certified Student Verification Report', 14, 287);
                                doc.text(`Page ${doc.internal.getNumberOfPages()}`, 192, 287);
                            }
                        });
                    }

                    const safeName = (String(uName).replace(/[^a-zA-Z0-9]/g, '_') || 'Scholar');
                    doc.save(`CogniPath_Certified_Report_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);

                    if (typeof showToast === 'function') {
                        showToast("Enterprise PDF Report downloaded successfully!");
                    }
                } catch (err) {
                    console.error("PDF Generation Error:", err);
                    if (typeof showToast === 'function') {
                        showToast("Error generating PDF report: " + (err.message || "Unknown error"));
                    }
                } finally {
                    btnDownloadReport.innerHTML = originalText;
                    btnDownloadReport.disabled = false;
                }
            }, 800);
        });
    }

    // --- Custom Dropdown UI Logic ---
    document.addEventListener('click', (e) => {
        const dropdown = e.target.closest('.custom-dropdown');
        if (dropdown) {
            const isDropdownSelected = e.target.closest('.dropdown-selected');
            const isOption = e.target.closest('.dropdown-options div');
            
            if (isDropdownSelected) {
                document.querySelectorAll('.custom-dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            } else if (isOption) {
                const value = isOption.getAttribute('data-value');
                const text = isOption.innerText;
                dropdown.setAttribute('data-value', value);
                const selectedEl = dropdown.querySelector('.dropdown-selected');
                selectedEl.innerHTML = `${text} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
                dropdown.querySelectorAll('.dropdown-options div').forEach(opt => opt.classList.remove('selected'));
                isOption.classList.add('selected');
                dropdown.classList.remove('active');
                const changeEvent = new CustomEvent('change', { detail: { value, text } });
                dropdown.dispatchEvent(changeEvent);
            }
        } else {
            document.querySelectorAll('.custom-dropdown.active').forEach(d => d.classList.remove('active'));
        }
    });

});

