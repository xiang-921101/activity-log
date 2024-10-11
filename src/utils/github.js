const github = require('@actions/github');
const core = require('@actions/core');
const eventDescriptions = require('../eventDescriptions');
const { username, token, eventLimit, style, ignoreEvents } = require('../config');

// Create an authenticated Octokit client
const octokit = github.getOctokit(token);

// Helper function to delay execution to avoid API rate limits
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch starred repositories with pagination
async function fetchAllStarredRepos() {
    let starredRepos = [];
    let page = 1;

    while (true) {
        try {
            const { data: pageStarredRepos } = await octokit.rest.activity.listReposStarredByAuthenticatedUser({
                per_page: 100,
                page
            });

            if (pageStarredRepos.length === 0) {
                break;
            }

            starredRepos = starredRepos.concat(pageStarredRepos);
            page++;

            // Introduce a small delay to avoid hitting rate limits
            await delay(500);

        } catch (error) {
            core.setFailed(`❌ Error fetching starred repositories: ${error.message}`);
            process.exit(1);
        }
    }

    // Create a set of starred repo names
    const starredRepoNames = new Set(starredRepos.map(repo => `${repo.owner.login}/${repo.name}`));

    return { starredRepoNames };
}

// Function to check if the event was likely triggered by GitHub Actions or bots
function isTriggeredByGitHubActions(event) {
    const botPatterns = /(\[bot\]|GitHub Actions|github-actions)/i;

    const isCommitEvent = event.type === 'PushEvent' && event.payload && event.payload.commits;
    if (isCommitEvent) {
        return event.payload.commits.some(commit =>
            botPatterns.test(commit.author.name)
        );
    }
    return false;
}

// Helper function to encode URLs
function encodeHTML(str) {
    return str
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// Function to fetch all events with pagination and apply filtering
async function fetchAllEvents() {
    let allEvents = [];
    let page = 1;

    while (allEvents.length < eventLimit) {
        try {
            const { data: events } = await octokit.rest.activity.listEventsForAuthenticatedUser({
                username,
                per_page: 100,
                page
            });

            if (events.length === 0) {
                core.warning('⚠️ No more events available.');
                break;
            }

            allEvents = allEvents.concat(events);
            page++;

            if (allEvents.length >= eventLimit) {
                break;
            }

            await delay(500);

        } catch (error) {
            core.setFailed(`❌ Error fetching events: ${error.message}`);
            process.exit(1);
        }
    }

    return allEvents;
}

// Function to fetch and filter events
async function fetchAndFilterEvents({ targetRepos }) {
    const { starredRepoNames } = await fetchAllStarredRepos();
    let allEvents = await fetchAllEvents();

    let filteredEvents = [];

    while (filteredEvents.length < eventLimit) {
        filteredEvents = allEvents
            .filter(event => !ignoreEvents.includes(event.type))
            .filter(event => !isTriggeredByGitHubActions(event))
            .filter(event => targetRepos.includes(event.repo.name))
            .map(event => {
                if (event.type === 'WatchEvent') {
                    const isStarred = starredRepoNames.has(event.repo.name);
                    return { ...event, type: isStarred ? 'StarEvent' : 'WatchEvent' };
                }
                return event;
            })
            .slice(0, eventLimit);

        if (filteredEvents.length < eventLimit) {
            const additionalEvents = await fetchAllEvents();
            allEvents = additionalEvents.concat(allEvents);
        } else {
            break;
        }
    }

    filteredEvents = filteredEvents.slice(0, eventLimit);

    const fetchedEventCount = filteredEvents.length;
    const totalFetchedEvents = allEvents.length;

    if (fetchedEventCount < eventLimit) {
        core.warning(`⚠️ Only ${fetchedEventCount} events met the criteria. ${totalFetchedEvents - fetchedEventCount} events were skipped due to filters.`);
    }

    const listItems = filteredEvents.map((event, index) => {
        const type = event.type;
        const repo = event.repo;
        const isPrivate = !event.public;
        const action = event.payload.pull_request
            ? (event.payload.pull_request.merged ? 'merged' : event.payload.action)
            : event.payload.action;

        const pr = event.payload.pull_request || {};
        const payload = event.payload;

        const description = eventDescriptions[type]
            ? (typeof eventDescriptions[type] === 'function'
                ? eventDescriptions[type]({ repo, isPrivate, pr, payload })
                : (eventDescriptions[type][action]
                    ? eventDescriptions[type][action]({ repo, pr, isPrivate, payload })
                    : core.warning(`Unknown action: ${action}`)))
            : core.warning(`Unknown event: ${event}`);

        return style === 'MARKDOWN'
            ? `${index + 1}. ${description}`
            : `<li>${encodeHTML(description)}</li>`;
    });

    return style === 'MARKDOWN'
        ? listItems.join('\n')
        : `<ol>\n${listItems.join('\n')}\n</ol>`;
}

module.exports = {
    fetchAndFilterEvents,
};
