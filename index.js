const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fastcsv = require('fast-csv');
const AdmZip = require('adm-zip');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());

app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const maleRows = [];
  const femaleRows = [];

  // Read and parse CSV file
  fs.createReadStream(filePath)
    .pipe(fastcsv.parse({ headers: true }))
    .on('data', (row) => {
      if (row.gender && row.gender.toLowerCase() === 'male') {
        maleRows.push(row);
      } else if (row.gender && row.gender.toLowerCase() === 'female') {
        femaleRows.push(row);
      }
    }) 
    .on('end', async () => {
      try {
        // Define paths for the male and female CSV files
        const malePath = 'uploads/male.csv';
        const femalePath = 'uploads/female.csv';

        // Function to write CSV files
        const writeCsvFile = (path, rows) => {
          return new Promise((resolve, reject) => {
            fastcsv.write(rows, { headers: true })
              .pipe(fs.createWriteStream(path))
              .on('finish', resolve)
              .on('error', reject);
          });
        };

        // Write male.csv and female.csv files
        await Promise.all([
          writeCsvFile(malePath, maleRows),
          writeCsvFile(femalePath, femaleRows)
        ]);

        // Create the ZIP folder
        const zip = new AdmZip();
        zip.addLocalFile(malePath);
        zip.addLocalFile(femalePath);
        const zipPath = 'uploads/result.zip';
        zip.writeZip(zipPath);

        // Send ZIP file to client
        res.download(zipPath, 'result.zip', (err) => {
          if (err) {
            console.error('Error downloading file:', err);
          }
          // free up memory.
          fs.unlinkSync(filePath);
          fs.unlinkSync(malePath);
          fs.unlinkSync(femalePath);
          fs.unlinkSync(zipPath);
        });

      } catch (error) {
        console.error('Error processing CSV:', error);
        res.status(500).send({ error: 'An error occurred while processing the CSV file.' });
      }
    })
    .on('error', (err) => res.status(500).send({ error: err.message }));
});

app.listen(5000, () => console.log('Server started on http://localhost:5000'));