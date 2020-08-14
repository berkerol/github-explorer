/* global $ */
let bearer;

const tr = document.createElement('tr');
const filter = 'filter-select filter-exact filter-onlyAvail mark-ignore';
const sorter = 'sorter-customDate';
const sort = 'sortInitialOrder-desc';
const headers = [['', 'Name'], ['', 'Description'], [filter, 'Language'], [filter, 'Type'], [sorter, 'Creation Date'], [sorter, 'Push Date'],
  [sort, 'Watchers'], [sort, 'Stars'], [sort, 'Forks'], [sort, 'Issues'], [sort, 'PRs'], [sort, 'Projects'], [sort, 'Commits'], [sort, 'Branches'],
  [sort, 'Releases'], [sort, 'Packages'], [sort, 'Deployments']];
for (const header of headers) {
  const th = document.createElement('th');
  th.className = header[0];
  th.innerHTML = header[1];
  tr.appendChild(th);
}
document.getElementsByTagName('thead')[0].appendChild(tr);

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
            watchers {totalCount}
            stargazers {totalCount}
            forkCount
            issues(states: OPEN) {totalCount}
            pullRequests(states: OPEN) {totalCount}
            projects(states: OPEN) {totalCount}
            defaultBranchRef {
              target {
                ... on Commit {
                  history {totalCount}
                }
              }
            }
            refs(refPrefix: "refs/heads/") {totalCount}
            releases {totalCount}
            packages {totalCount}
            deployments {totalCount}
            url
          }
        }
      }
    }
  }`;
}

window.list = async function () {
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
      text(repo.node.refs.totalCount), text(repo.node.releases.totalCount), text(repo.node.packages.totalCount), text(repo.node.deployments.totalCount)];
    for (const field of fields) {
      const cell = document.createElement('td');
      cell.appendChild(field);
      row.appendChild(cell);
    }
    $('table tbody').append(row);
  }
  $('table').trigger('update');
  document.getElementById('loading').innerHTML = '';
};

$(function () {
  $('table').tablesorter({
    theme: 'bootstrap',
    sortReset: true,
    sortList: [[0, 0]],
    headerTemplate: '{content} {icon}',
    widgets: ['uitheme', 'zebra', 'saveSort', 'resizable', 'filter', 'mark', 'print', 'columnSelector', 'stickyHeaders'],
    widgetOptions: {
      filter_cssFilter: 'form-control',
      filter_external: '.search',
      filter_reset: '.reset-filter',
      filter_saveFilters: true,
      print_styleSheet: 'https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.1/css/theme.bootstrap_4.min.css',
      columnSelector_container: '#popover-target',
      columnSelector_mediaqueryState: false
    }
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
  $('#popover').popover({
    placement: 'right',
    html: true,
    content: $('#popover-target')
  });
  $('.reset-sort').click(function () {
    $('table').trigger('saveSortReset').trigger('sortReset');
    return false;
  });
  $('.print').click(function () {
    $('table').trigger('printTable');
  });
});
