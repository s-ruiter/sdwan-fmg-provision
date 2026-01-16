document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const statusMessage = document.getElementById('status-message');
    const loginCard = document.getElementById('login-card');
    const dashboard = document.getElementById('dashboard');
    const sessionIdDisplay = document.getElementById('session-id-display');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset state
        statusMessage.className = 'status-message';
        statusMessage.textContent = '';
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        const ip = document.getElementById('ip').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ip, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            // Success
            handleLoginSuccess(data.session);

        } catch (error) {
            statusMessage.textContent = error.message;
            statusMessage.classList.add('error');
            // Shake animation for error
            loginCard.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], {
                duration: 400,
                easing: 'ease-in-out'
            });
        } finally {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', () => {
        // Simple logout for now - just reset view
        dashboard.classList.add('hidden');
        loginCard.classList.remove('hidden');
        document.getElementById('password').value = '';
    });

    const provisionScope = document.getElementById('provision-scope');
    const stepSelectContainer = document.getElementById('step-selection-container');
    const stepSelect = document.getElementById('step-select');

    provisionScope.addEventListener('change', (e) => {
        if (e.target.value === 'single') {
            stepSelectContainer.classList.remove('hidden');
        } else {
            stepSelectContainer.classList.add('hidden');
        }
    });

    const provisionBtn = document.getElementById('provision-btn');
    provisionBtn.addEventListener('click', async () => {
        const config = {
            ip: document.getElementById('ip').value,
            adom: document.getElementById('adom').value,
            dns_primary: document.getElementById('dns_primary').value,
            dns_secondary: document.getElementById('dns_secondary').value,
            faz_target_ip: document.getElementById('faz_target_ip').value,
            faz_target_sn: document.getElementById('faz_target_sn').value,
            corp_lan_subnet: document.getElementById('corp_lan_subnet').value,
            corp_lan_netmask: document.getElementById('corp_lan_netmask').value,
            session: sessionIdDisplay.textContent,
            scope: provisionScope.value,
            step_name: provisionScope.value === 'single' ? stepSelect.value : null
        };

        // UI Feedback
        provisionBtn.disabled = true;
        provisionBtn.textContent = 'Provisioning...';

        try {
            console.log('Sending provisioning request:', config);

            const response = await fetch('/api/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const result = await response.json();
            console.log('Provisioning result:', result);

            if (!response.ok) {
                throw new Error(result.detail || 'Provisioning failed');
            }

            const resultsContainer = document.getElementById('provision-results');
            const resultsList = document.getElementById('results-list');
            resultsList.innerHTML = '';

            result.results.forEach(item => {
                const div = document.createElement('div');
                div.className = `result-item ${item.status === 'success' ? 'success' : 'error'}`;

                const icon = item.status === 'success' ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';

                div.innerHTML = `
                    <div class="result-icon">${icon}</div>
                    <div class="result-name">${item.name}</div>
                    <div class="result-details" style="flex: 1; text-align: right; margin-left:10px;">${item.message}</div>
                `;
                resultsList.appendChild(div);
            });

            resultsContainer.classList.remove('hidden');

        } catch (error) {
            console.error('Provisioning error:', error);
            const msg = typeof error.message === 'object' ? JSON.stringify(error.message) : error.message;
            alert('Error: ' + msg);
        } finally {
            provisionBtn.disabled = false;
            provisionBtn.textContent = 'Run Provisioning';
        }
    });

    async function handleLoginSuccess(sessionId) {
        statusMessage.textContent = 'Connected successfully!';
        statusMessage.classList.add('success');

        // Load steps for selection
        try {
            const response = await fetch('/api/collection');
            if (response.ok) {
                const collection = await response.json();
                const stepSelect = document.getElementById('step-select');
                stepSelect.innerHTML = '';

                if (collection.item && Array.isArray(collection.item)) {
                    collection.item.forEach(item => {
                        // Skip login step if desired, or keep all
                        const option = document.createElement('option');
                        option.value = item.name;
                        option.textContent = item.name;
                        stepSelect.appendChild(option);
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load steps', e);
        }

        setTimeout(() => {
            loginCard.classList.add('hidden');
            dashboard.classList.remove('hidden');
            sessionIdDisplay.textContent = sessionId;
        }, 800);
    }
});
