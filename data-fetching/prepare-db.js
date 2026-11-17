const fs = require('node:fs');
const path = require('node:path');

const readJson = (filename) => {
  const filePath = path.join(__dirname, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const tasksResponse = readJson('tasks.json');

const tasks = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse.tasks;

if (!Array.isArray(tasks)) {
  throw new Error('Invalid tasks.json: expected a tasks array.');
}

// Derive unique users from the task assignees.
const users = [
  ...new Map(
    tasks.filter((task) => task.assignee).map((task) => [task.assignee.id, task.assignee]),
  ).values(),
];

let activities = [];
try {
  const activitiesResponse = readJson('activities.json');
  activities = Array.isArray(activitiesResponse)
    ? activitiesResponse
    : activitiesResponse.activities || [];
} catch (e) {
  activities = [];
}

const database = {
  tasks,
  users,
  activities,
};

const outputPath = path.join(__dirname, 'db.json');

fs.writeFileSync(outputPath, JSON.stringify(database, null, 2), 'utf8');

console.log(`Mock database generated successfully: ${outputPath}`);
console.log(`Tasks: ${tasks.length}`);
console.log(`Users: ${users.length}`);
