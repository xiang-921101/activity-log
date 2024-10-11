const { fetchAndFilterEvents } = require('./utils/github');
const { updateReadme } = require('./utils/file');
const { username, token, eventLimit, ignoreEvents, readmePath, commitMessage, targetRepos } = require('./config');
const core = require('@actions/core')

// Main function to execute the update process
async function main() {
    try {
        // Add `targetRepos` to the fetchAndFilterEvents call
        const activity = await fetchAndFilterEvents({ username, token, eventLimit, ignoreEvents, targetRepos });
        await updateReadme(activity, readmePath);
    } catch (error) {
        core.setFailed(`❌ Error in the update process: ${error.message}`);
        console.error(error)
        process.exit(1);
    }
}

// Execute the main function
main();
