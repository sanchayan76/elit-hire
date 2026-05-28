const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Helper to get file path for a test ID
const getFilePath = (testId) => path.join(DATA_DIR, `${testId}.json`);

// Save candidate and test data
app.post('/api/save-data', (req, res) => {
  const { testId, data, type } = req.body;
  if (!testId) return res.status(400).send('Missing testId');

  const filePath = getFilePath(testId);
  let existingData = {};

  if (fs.existsSync(filePath)) {
    existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Merge new data based on type
  if (type === 'candidate') {
    existingData.candidate = data;
  } else if (type === 'result') {
    existingData.result = data;
  } else if (type === 'job') {
    // Special case for global jobs list
    const jobsPath = path.join(DATA_DIR, 'jobs.json');
    fs.writeFileSync(jobsPath, JSON.stringify(data, null, 2));
    return res.send({ message: 'Jobs saved' });
  }

  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  res.send({ message: 'Data saved successfully' });
});

// Load all candidates for Admin
app.get('/api/candidates', (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'jobs.json');
  const allData = files.map(file => {
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
    const parsed = JSON.parse(content);
    const testId = file.replace('.json', '');
    
    if (parsed.result && (parsed.result.status === 'completed' || parsed.result.evaluationStatus === 'completed')) {
      return {
        testId: testId,
        fullName: parsed.candidate?.full_name || 'Unknown',
        email: parsed.candidate?.email || 'N/A',
        finalScore: parsed.result.finalScore || 0,
        codingScore: parsed.result.codingScore || 0,
        penaltyScore: parsed.result.penaltyScore || 0,
        decision: parsed.result.decision || 'PENDING',
        suggestedRole: parsed.result.suggestedRole || parsed.result.ai_evaluation?.suggested_role,
        completedAt: parsed.result.completedAt || new Date().toISOString()
      };
    }
    return null;
  }).filter(Boolean);

  res.send(allData);
});

// Load specific test results
app.get('/api/results/:testId', (req, res) => {
  const filePath = getFilePath(req.params.testId);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.send(data);
});

// Delete a candidate
app.delete('/api/candidates/:testId', (req, res) => {
  const filePath = getFilePath(req.params.testId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.send({ message: 'Deleted' });
  } else {
    res.status(404).send('Not found');
  }
});

// Job Openings
app.get('/api/jobs', (req, res) => {
  const jobsPath = path.join(DATA_DIR, 'jobs.json');
  if (fs.existsSync(jobsPath)) {
    res.send(JSON.parse(fs.readFileSync(jobsPath, 'utf8')));
  } else {
    res.send([]);
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
