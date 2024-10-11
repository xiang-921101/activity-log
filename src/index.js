const { fetchAndFilterEvents } = require('./utils/github');
const { username, token, eventLimit, style, ignoreEvents } = require('./config');
const core = require('@actions/core');

// Main function to execute the update process
async function main() {
    try {
        const targetRepos = ['repo1', 'repo2']; // 替換為你的實際邏輯來獲取目標存儲庫列表
        const activity = await fetchAndFilterEvents({ targetRepos, username, token, eventLimit, ignoreEvents });
        // 其他的處理邏輯，例如更新 README 文件
    } catch (error) {
        core.setFailed(`❌ Error in the update process: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Execute the main function
main();
