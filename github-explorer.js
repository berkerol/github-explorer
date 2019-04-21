/* global $ */
let bearer;

window.fetch('https://gist.githubusercontent.com/mobikasaba/9621924d939b5c818aa25c4114e29abd/raw/293aa51fd8d1d9cefefc19eea117efbe8dc5e551/github-explorer')
  .then(res => {
    return res.text();
  })
  .then(res => {
    bearer = res;
  });

function text (text) {
  return document.createTextNode(text === 'null' ? '' : text);
}

function element (t, url) {
  const i = document.createElement('i');
  i.setAttribute('class', 'fas fa-external-link-alt');
  const a = document.createElement('a');
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  a.setAttribute('href', url);
  a.appendChild(i);
  const span = document.createElement('span');
  span.appendChild(text(t + ' '));
  span.appendChild(a);
  return span;
}

function query (owner, after) {
  return `query {
    rateLimit {
      cost
      remaining
      resetAt
    }
    repositoryOwner(login: "${owner}") {
      repositories(first: 100${after}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            name
            description
            primaryLanguage {name}
            owner {login}
            isFork
            createdAt
            pushedAt
            stargazers {totalCount}
            watchers {totalCount}
            forkCount
            issues {totalCount}
            pullRequests {totalCount}
            projects {totalCount}
            defaultBranchRef {
              target {
                ... on Commit {
                  history {totalCount}
                }
              }
            }
            refs(refPrefix: "refs/heads/") {totalCount}
            releases {totalCount}
            deployments {totalCount}
            url
          }
        }
      }
    }
  }`;
}

async function list () { // eslint-disable-line no-unused-vars
  const owner = document.getElementById('owner').value;
  document.getElementById('loading').innerHTML = 'Loading';
  let after = '';
  let repos = [];
  do {
    await window.fetch('https://api.github.com/graphql', { method: 'POST', body: JSON.stringify({ query: query(owner, after) }), headers: { Authorization: 'Bearer ' + bearer } })
      .then(res => {
        return res.json();
      })
      .then(res => {
        console.log(`Cost: ${res.data.rateLimit.cost} Remaining: ${res.data.rateLimit.remaining} Reset at: ${new Date(res.data.rateLimit.resetAt)}`);
        res = res.data.repositoryOwner.repositories;
        repos = repos.concat(res.edges);
        if (res.pageInfo.hasNextPage) {
          after = `, after: "${res.pageInfo.endCursor}"`;
        } else {
          after = '';
        }
      })
      .catch(error => {
        console.error(error);
        after = '';
      });
  } while (after !== '');
  $('table tbody').empty();
  for (const repo of repos) {
    const row = document.createElement('tr');
    const fields = [element(repo.node.name, repo.node.url), text(repo.node.description),
      text(repo.node.primaryLanguage === null ? '' : repo.node.primaryLanguage.name),
      text(repo.node.owner.login.toLocaleLowerCase() === owner.toLocaleLowerCase() ? (repo.node.isFork ? 'Fork' : 'Owner') : 'Collaborator'),
      text(new Date(repo.node.createdAt)), text(new Date(repo.node.pushedAt)), text(repo.node.watchers.totalCount),
      text(repo.node.stargazers.totalCount), text(repo.node.forkCount), text(repo.node.issues.totalCount),
      text(repo.node.pullRequests.totalCount), text(repo.node.projects.totalCount), text(repo.node.defaultBranchRef.target.history.totalCount),
      text(repo.node.refs.totalCount), text(repo.node.releases.totalCount), text(repo.node.deployments.totalCount)];
    for (const field of fields) {
      const cell = document.createElement('td');
      cell.appendChild(field);
      row.appendChild(cell);
    }
    $('table tbody').append(row);
  }
  $('table').trigger('update');
  document.getElementById('loading').innerHTML = '';
}

$(function () {
  $('table').tablesorter({
    theme: 'bootstrap',
    sortReset: true,
    sortList: [[0, 0]],
    headerTemplate: '{content} {icon}',
    widgets: ['uitheme', 'zebra', 'resizable', 'filter', 'saveSort', 'stickyHeaders']
  }).tablesorterPager({
    container: $('.ts-pager'),
    output: '{startRow} - {endRow} / {filteredRows} ({totalRows})'
  });

  $.tablesorter.addParser({
    id: 'customDate',
    format: s => {
      return Date.parse(s);
    },
    type: 'numeric'
  });
});
