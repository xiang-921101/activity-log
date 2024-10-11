const { fetchAndFilterEvents } = require('./utils/github');
const { username, token, eventLimit, style, ignoreEvents } = require('./config');
const core = require('@actions/core');

// Main function to execute the update process
async function main() {
    try {
        const targetRepos = ['repo1', 'repo2']; // Replace with your actual logic to fetch target repositories
        const activity = await fetchAndFilterEvents({ targetRepos, username, token, eventLimit, ignoreEvents });
        // Additional processing logic, such as updating the README file
    } catch (error) {
        core.setFailed(`❌ Error in the update process: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Execute the main function
main();
