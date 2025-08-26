// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');

            // Hide all tab contents
            tabContents.forEach(content => content.classList.add('off'));
            
            // Show target tab content
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.remove('off');
            }
        });
    });

    // Action button handlers
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn')) {
            const button = e.target.closest('.action-btn');
            const friendItem = button.closest('.friend-item');
            const friendName = friendItem.querySelector('.friend-name').textContent;
            
            if (button.textContent.includes('Follow')) {
                button.innerHTML = '<i class="fa-solid fa-clock"></i> Pending';
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
                button.disabled = true;
            } else if (button.textContent.includes('Accept')) {
                // Move to friends tab logic would go here
                friendItem.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    friendItem.style.display = 'none';
                }, 300);
            } else if (button.textContent.includes('Decline')) {
                friendItem.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    friendItem.style.display = 'none';
                }, 300);
            } else if (button.textContent.includes('Unfollow')) {
                if (confirm(`Are you sure you want to unfollow ${friendName}?`)) {
                    friendItem.style.transform = 'scale(0)';
                    setTimeout(() => {
                        friendItem.style.display = 'none';
                    }, 300);
                }
            }
        }
    });
});