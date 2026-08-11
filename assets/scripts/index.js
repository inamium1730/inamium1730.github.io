document.addEventListener("DOMContentLoaded", async () => {
    // Theme toggling logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = localStorage.getItem('theme') || (systemPrefersDark ? 'dark' : 'light');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
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
    
    copyNameBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(profileName.textContent);
            copyNameIcon.classList.remove('fa-copy');
            copyNameIcon.classList.add('fa-check');
            copyNameIcon.style.color = '#22c55e';
            setTimeout(() => {
                copyNameIcon.classList.remove('fa-check');
                copyNameIcon.classList.add('fa-copy');
                copyNameIcon.style.color = '';
            }, 2000);
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
