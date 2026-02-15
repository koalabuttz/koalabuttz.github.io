// Event listeners for modal interactions
document.addEventListener('DOMContentLoaded', function() {
	// Open modal when snapchat icon is clicked
	const snapchatTrigger = document.getElementById('snapchat-trigger');
	const modal = document.getElementById('modal01');

	if (snapchatTrigger && modal) {
		snapchatTrigger.addEventListener('click', function() {
			modal.style.display = 'block';
		});
	}

	// Close modal when clicking anywhere on the modal
	if (modal) {
		modal.addEventListener('click', function() {
			this.style.display = 'none';
		});
	}
});
