document.addEventListener("DOMContentLoaded", async () => {
    // Theme toggling logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = localStorage.getItem('theme') || (systemPrefersDark ? 'dark' : 'light');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    };

    // Apply initial theme
    applyTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    });

    // Jelly animation on mobile tap
    const avatar = document.getElementById('profile-image');
    const avatarContainer = document.querySelector('.avatar-container');
    
    if (avatarContainer && avatar) {
        const triggerJelly = () => {
            avatar.classList.remove('jelly-anim');
            void avatar.offsetWidth; // trigger reflow
            avatar.classList.add('jelly-anim');
        };

        avatarContainer.addEventListener('click', triggerJelly);
        avatarContainer.addEventListener('touchstart', triggerJelly, {passive: true});
    }

    const username = 'inamium1730';
    const profileName = document.getElementById('profile-name');
    const profileBio = document.getElementById('profile-bio');
    const githubLink = document.getElementById('github-link');
    const statusBadge = document.getElementById('status-badge');

    // Name copy logic
    const copyNameBtn = document.getElementById('copy-name-btn');
    const copyNameIcon = document.getElementById('copy-name-icon');
    const copyBubble = document.getElementById('copy-bubble');
    const nameWrapper = document.getElementById('name-wrapper');
    const copyBtnContainer = document.querySelector('.copy-btn-container');
    
    const copyMessages = [
        "コピーされました！", // 1
        "ダブルコピー！",    // 2
        "トリプルコピー！",  // 3
        "連続コピー！",      // 4
        "コピー記録更新！",  // 5
        "コピーの天才！",    // 6
        "誰にも止められない！",// 7
        "超絶コピー記録！",  // 8
        "コピーモンスター！！",// 9
        "神レベル！！！",    // 10
        "神超え！！！！"     // 11
    ];

    let copyCombo = 0;
    let lastBubbleHideTime = 0;
    let bubbleVisible = false;

    // Reset combo when mouse leaves name-wrapper
    nameWrapper.addEventListener('mouseleave', () => {
        if (!bubbleVisible) {
            copyCombo = 0;
        }
    });

    copyNameBtn.addEventListener('click', async () => {
        if (bubbleVisible) return; // Prevent copy while bubble is showing

        const now = Date.now();
        if (copyCombo > 0 && (now - lastBubbleHideTime) <= 250) {
            copyCombo++;
        } else {
            copyCombo = 1;
        }

        if (copyCombo > 11) copyCombo = 11;

        try {
            await navigator.clipboard.writeText(profileName.textContent);
            
            bubbleVisible = true;
            copyBtnContainer.classList.add('bubble-active');
            nameWrapper.classList.add('force-hover');

            const msgIndex = copyCombo - 1;
            copyBubble.textContent = copyMessages[msgIndex];

            if (copyCombo >= 10) {
                copyBubble.classList.add('red', 'shake');
            } else {
                copyBubble.classList.remove('red', 'shake');
            }

            copyBubble.classList.add('show');

            setTimeout(() => {
                copyBubble.classList.remove('show');
                bubbleVisible = false;
                lastBubbleHideTime = Date.now();
                
                // Delay removal of classes so transition works smoothly
                setTimeout(() => {
                    if (!bubbleVisible) {
                        copyBtnContainer.classList.remove('bubble-active');
                        nameWrapper.classList.remove('force-hover');
                    }
                }, 200);

            }, 1000);

        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    });

    try {
        // Fetch GitHub user data
        const response = await fetch(`https://api.github.com/users/${username}`);
        
        if (!response.ok) {
            throw new Error('GitHub API fetch failed');
        }

        const data = await response.json();

        // Remove skeleton classes
        avatar.classList.remove('skeleton');
        profileName.classList.remove('skeleton');
        profileBio.classList.remove('skeleton');
        
        // Clear inline styles used for skeletons
        profileName.style = "";
        profileBio.style = "";

        // Populate data
        avatar.src = data.avatar_url;
        profileName.textContent = data.name || data.login;
        profileBio.textContent = data.bio || 'Web Developer / Creator';
        githubLink.href = data.html_url;

        // Show status badge
        statusBadge.style.display = "block";

    } catch (error) {
        console.error("Error loading profile:", error);
        
        // Fallback content in case of error
        avatar.classList.remove('skeleton');
        profileName.classList.remove('skeleton');
        profileBio.classList.remove('skeleton');
        profileName.style = "";
        profileBio.style = "";

        avatar.src = `https://avatars.githubusercontent.com/${username}`;
        profileName.textContent = username;
        profileBio.textContent = 'Welcome to my profile page!';
        statusBadge.style.display = "block";
    }
});
