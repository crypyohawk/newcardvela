// Temp script to check model capabilities - directly call copilot API
const http = require('http');
const fs = require('fs');

// Read the copilot token from copilot-api
http.get('http://127.0.0.1:4141/token', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const token = JSON.parse(data).token;
    // Now call the copilot models endpoint directly
    const url = new URL('https://api.individual.githubcopilot.com/models');
    const req = require('https').get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Copilot-Integration-Id': 'vscode-chat',
        'Editor-Version': 'vscode/1.104.3',
      }
    }, res2 => {
      let d = '';
      res2.on('data', c => d += c);
      res2.on('end', () => {
        const models = JSON.parse(d);
        models.data.filter(m => /claude-opus-4\.6\b|gpt-5\.4\b/i.test(m.id)).forEach(m => {
          console.log(m.id, JSON.stringify(m.capabilities?.limits));
        });
      });
    });
  });
});
