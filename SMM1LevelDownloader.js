const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const retry = require('retry')

const partNames = [
    "thumbnail0.tnl",
    "course_data.cdt",
    "course_data_sub.cdt",
    "thumbnail1.tnl"
];

// customize these to your liking
const outputDirectory = 'H:\\smm1-levels\\to_upload';
const compressedDir = 'H:\\smm1-levels\\compressed_files';

// Path to the ASH Extractor executable within the SMMDownloader directory
const ashextractorExecutable = path.join(path.join(__dirname, 'SMMDownloader'), 'ashextractor.exe');

const getUrl = (url, ...rest) => {
  const op = retry.operation();
  return new Promise((resolve, reject) => op.attempt(async (currentAttempt) => {
    try {
      resolve(await axios.get(url, ...rest));
    } catch (e) {
      if (op.retry(e)) {
        console.error(`[warning] retrying get (try ${currentAttempt}):`, url);
        return;
      }
      reject(op.mainError());
    }
  }));
}

async function fetchOriginalUrl(levelId) {
    const internalLevelId = parseInt(levelId.split('-').slice(2).join(''), 16);
    const encodedUrl = encodeURIComponent(`https://d2sno3mhmk1ekx.cloudfront.net/10.WUP_AMAJ_datastore/ds/1/data/${internalLevelId.toString().padStart(11, '0')}-00001/`);
    const apiUrl = `https://web.archive.org/web/timemap/json?url=${encodedUrl}&matchType=prefix&collapse=urlkey&output=json&filter=!statuscode%3A%5B45%5D..&limit=10000&fl=original`;
  
    const headers = {
        'Accept': '*/*',
        'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
        'Referer': `https://web.archive.org/web/20240000000000*/${encodedUrl}`,
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
    };
  
    const response = await getUrl(apiUrl, { headers });
    console.log(`Fetched original URL from Wayback Machine: ${JSON.stringify(response.data)}`);
    
    const originalUrl = response.data[1]?.[0];
    if (!originalUrl) {
        console.error('[error] No archived version found for', levelId);
        console.log('[error] No archived original url found for', originalUrl);
        return null;
    }
  
    return originalUrl;
}

async function fetchArchiveUrl(originalUrl) {
    if (!originalUrl) {
      return null
    }

    const encodedUrl = encodeURIComponent(originalUrl);
    const apiUrl = `https://web.archive.org/__wb/sparkline?output=json&url=${encodedUrl}&collection=web`;
  
    const headers = {
        'Accept': '*/*',
        'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
        'Referer': `https://web.archive.org/web/20240000000000*/${encodedUrl}`,
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
    };
  
    const response = await getUrl(apiUrl, { headers });
    console.log(`Fetched archive URL from Wayback Machine: ${JSON.stringify(response.data)}`);
    
    const archiveTimestamp = response.data.first_ts;
    if (!archiveTimestamp) {
        console.error('[error] No archived version found for', originalUrl);
        console.log('[error] No archived version found for', originalUrl);
        return null;
    }
  
    const archiveUrl = `https://web.archive.org/web/${archiveTimestamp}if_/${originalUrl}`;
    return archiveUrl;
}

async function downloadFile(fileUrl, outputPath) {
    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'TE': 'trailers',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    };
  
    try {
      const response = await getUrl(fileUrl, { 
        headers: headers,
        responseType: 'arraybuffer',
        decompress: true 
      });
      fs.writeFileSync(outputPath, response.data);
      console.log(`File downloaded at: ${outputPath}`);
    } catch (error) {
      console.error('[error] downloading file:', error.message);
    }
  }

  function splitFile(filePath) {
    const partNamesFirst = [
        "thumbnail0.tnl",
        "course_data.cdt",
        "course_data_sub.cdt",
        "thumbnail1.tnl"
    ];

    const hasProcessedFile = (dir) => fs.existsSync(path.join(dir, partNamesFirst[1])) && fs.existsSync(path.join(dir, partNamesFirst[2]))

    // Ensure we have a directory to save the parts
    const partsDirectory = path.join(outputDirectory, `${path.basename(filePath, path.extname(filePath)).replace(/_compressed$/, '')}`);
    if (!fs.existsSync(partsDirectory)) {
        fs.mkdirSync(partsDirectory, { recursive: true });
    } else if(hasProcessedFile(outputDirectory)) {
      console.log(`[warning] Skipping ${filePath} because it has already been processed`)
      return;
    }

    console.log(`Splitting file: ${filePath}`);
    const data = fs.readFileSync(filePath);

    // ASH0 in hexadecimal byte representation
    const separator = Buffer.from([0x41, 0x53, 0x48, 0x30]); // ASCII for 'ASH0'
    let parts = [];
    let lastIndex = 0;
    let index = 0;

    // Search through the file for each occurrence of the separator
    while ((index = data.indexOf(separator, lastIndex)) !== -1) {
        let endOfPart = data.indexOf(separator, index + separator.length);
        endOfPart = endOfPart === -1 ? data.length : endOfPart; // Handle last part

        const partData = data.slice(index, endOfPart);
        if (partData.length > 0) {
            parts.push(partData);
        }
        lastIndex = endOfPart;
    }

    if (parts.length !== 4) {
      throw new Error(`${filePath} has more than 4 ASH0 headers`)
    }

    // Save each part with the predetermined names
    parts.forEach((part, i) => {
        if (i < partNamesFirst.length) { // Ensure we don't exceed the names array
            const partFilePath = path.join(partsDirectory, partNamesFirst[i]);
            fs.writeFileSync(partFilePath, part);
            console.log(`Saved: ${partFilePath}`);
        }
    });

    decompressAndRenameFiles(partsDirectory, parts.length, partNamesFirst);

    extractThumbnails(partsDirectory, partNamesFirst.filter(n => n.endsWith('tnl')))
}

function containsSpecificFile(directory, fileName) {
    try {
      const files = fs.readdirSync(directory);
      return files.includes(fileName);
    } catch (error) {
      console.error(`[error] reading directory ${directory}:`, error);
      return false;
    }
  }
  
  // Function to rename a file if a file with a certain name exists
  function renameFileIfConditionMet(directory, originalFileName, newFileName) {
    const filePath = path.join(directory, originalFileName);
    const newFilePath = path.join(directory, newFileName);
  
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, newFilePath);
      console.log(`Renamed ${originalFileName} to ${newFileName}`);
    } else {
      console.log(`${originalFileName} does not exist and cannot be renamed.`);
    }
  }

// Function to decompress a file if a file using ASH Extractor http://wiibrew.org/wiki/ASH_Extractor
  function decompressAndRenameFiles(partsDirectory, partCount, partNamesFirst) {
    for (let i = 0; i < partCount; i++) {
        const partFilePath = path.join(partsDirectory, partNamesFirst[i]);

        try {
            console.log(`Decompressing: ${partFilePath}`);
            execSync(`"${ashextractorExecutable}" "${partFilePath}"`);
            console.log(`Decompressed: ${partFilePath}`);
        } catch (error) {
            if (containsSpecificFile(partsDirectory, partNamesFirst[i]+".arc")) {
                console.log(`${partFilePath} has sucessfully been compressed!`);
                renameFileIfConditionMet(partsDirectory, partNamesFirst[i]+".arc", partNames[i]);
            }
        }
    }

    console.log(`All files have been decompressed, u find them here ${partsDirectory}`);
}

function extractThumbnails(partsDir, thumbnailNames) {
  thumbnailNames.forEach(async (name) => {
    console.log(`Extracting thumbnail from ${name}`)
    const file = fs.readFileSync(path.join(partsDir, name));
    fs.writeFileSync(path.join(partsDir, `${path.basename(name, '.tnl')}.jpg`), file.slice(8))
    fs.rmSync(path.join(partsDir, name));
    console.log(`Extracted thumbnail from ${name}`)
  })
}

async function processLevelId(levelId) {
    console.log(`processing ${levelId}`)

    const fileName = `${levelId}_compressed`;
    const outputPath = path.join(compressedDir, fileName);

    if (!fs.existsSync(outputPath)) {
      const archiveUrl = await fetchArchiveUrl(await fetchOriginalUrl(levelId));
      if (!archiveUrl) return;
      await downloadFile(archiveUrl, outputPath);
    }

    splitFile(outputPath);
}

// use as follows:
processLevelId('0000-0000-02e7-c6d0');

async function yeehaw() {
  // const levelsUrl = 'https://is-smm-beaten-yet-public-data.s3.us-west-2.amazonaws.com/levels/cleared.json';

  // const levels = (await axios(levelsUrl)).data;

  // const continueFrom = '5B9D-0000-01BC-C209';
  // const remainingLevels = levels.slice(levels.findIndex(({ levelId }) => levelId === continueFrom))
  // const remainingLevels = levels;
  const remainingLevels = 
  [
      "01F8-0000-02A4-58F2",
      "0CEA-0000-0093-CB82",
      "0DE4-0000-02C6-29DC",
      "0E45-0000-0117-C846",
      "0F01-0000-0080-8A27",
      "104C-0000-00FF-59BF",
      "11AF-0000-0169-CC21",
      "138B-0000-0197-94E9",
      "1715-0000-0213-A139",
      "18DB-0000-02B9-467B",
      "1D84-0000-01E1-278F",
      "20BD-0000-01E9-018D",
      "224D-0000-019F-D134",
      "247E-0000-0285-1652",
      "25BD-0000-0293-ACD9",
      "285B-0000-02A3-5474",
      "291A-0000-02B2-E703",
      "296F-0000-0126-A0A2",
      "2978-0000-01AD-BEC5",
      "2BC7-0000-02C5-F135",
      "2BEA-0000-02D3-272F",
      "2C09-0000-0290-D05A",
      "2D17-0000-02BF-82D9",
      "2E2D-0000-011F-47CD",
      "2FA7-0000-03A3-EC1A",
      "2FEB-0000-01DC-BC49",
      "2FFF-0000-01B3-4565",
      "38DF-0000-0278-60A1",
      "3940-0000-00F0-755C",
      "3B38-0000-02A6-14B5",
      "3B9B-0000-02BA-0114",
      "3E3D-0000-01E5-2D1C",
      "3FAF-0000-023D-4AF2",
      "4201-0000-01E1-06F1",
      "43B3-0000-01B1-1591",
      "470D-0000-0354-A9D3",
      "4999-0000-02D5-3E9B",
      "49DA-0000-0082-E79E",
      "4A8F-0000-02D6-479A",
      "4CB1-0000-00CF-5598",
      "4CDB-0000-02A9-1A23",
      "4DD8-0000-0293-FEC5",
      "4FD2-0000-02B8-5664",
      "520A-0000-0122-3891",
      "522F-0000-0179-7C2B",
      "529E-0000-0297-3A25",
      "56F4-0000-02AC-3951",
      "571B-0000-0297-3577",
      "5D04-0000-00BD-4D49",
      "5D3B-0000-0167-1B8E",
      "6226-0000-0248-5B76",
      "6466-0000-0104-0468",
      "669F-0000-00CF-70A9",
      "6822-0000-0299-FECB",
      "68DD-0000-02C6-5185",
      "6A39-0000-02BB-615E",
      "6B29-0000-02A2-D481",
      "6B2E-0000-02A5-D211",
      "6B5B-0000-02D0-24FB",
      "6C1B-0000-01C4-B09F",
      "6F34-0000-03BE-37FA",
      "7393-0000-028C-D856",
      "73F3-0000-028E-7278",
      "7452-0000-0111-1A12",
      "74A8-0000-01C3-6229",
      "7873-0000-00D0-C65A",
      "7A92-0000-019D-DAE6",
      "7B20-0000-01B4-53B3",
      "7B5A-0000-01DB-C2A9",
      "7B7C-0000-025A-A316",
      "80A4-0000-02CD-2005",
      "86D6-0000-030F-77C9",
      "8863-0000-02DF-ACA3",
      "8867-0000-01AE-FF2A",
      "88AC-0000-0199-7710",
      "8944-0000-02D6-2BE9",
      "8A27-0000-02A4-1E14",
      "8A73-0000-01EA-F7AD",
      "8BC3-0000-02E0-B905",
      "8DD0-0000-0224-BE32",
      "8F58-0000-0092-DFE5",
      "90A3-0000-0205-1EFC",
      "95F4-0000-02AE-5103",
      "96DF-0000-0393-EFCC",
      "972D-0000-01C3-359F",
      "9A83-0000-032B-D154",
      "9AFD-0000-01CC-6EDB",
      "9B9F-0000-02A7-CA22",
      "9C57-0000-02BD-829D",
      "9D04-0000-0116-9C81",
      "9D90-0000-01D5-3961",
      "A00F-0000-0384-C368",
      "A048-0000-0099-1F8C",
      "AB0F-0000-029F-3CA2",
      "AB3B-0000-00F2-4065",
      "AC1E-0000-0211-D210",
      "AE4F-0000-02A6-1933",
      "AF02-0000-01B4-B105",
      "B7AB-0000-022F-483E",
      "BDE8-0000-01BD-3A78",
      "BE02-0000-01CB-B0DF",
      "C013-0000-02C6-5BA2",
      "C369-0000-02A6-7287",
      "C82B-0000-004A-51B8",
      "C91A-0000-00B7-B4AA",
      "D05C-0000-0113-6917",
      "D227-0000-02B5-7AC3",
      "D2DE-0000-02C6-7D20",
      "D375-0000-03C4-6EB5",
      "D465-0000-02A0-8D2B",
      "D7BE-0000-01E7-979D",
      "DC4A-0000-0121-8DFA",
      "DE4C-0000-018E-0F8D",
      "DEAF-0000-0286-2F1A",
      "DFA8-0000-0191-BE81",
      "E2B1-0000-010C-FD6E",
      "E2EC-0000-00BE-4C18",
      "E42B-0000-023E-7594",
      "E43A-0000-0397-C3AF",
      "E456-0000-029A-74B4",
      "E52B-0000-02DE-80AB",
      "E87F-0000-028C-67CD",
      "EC7E-0000-02CF-C35C",
      "F202-0000-029E-D87F",
      "F291-0000-01C0-1DEC",
      "F353-0000-03A9-6140",
      "F41F-0000-008A-ACCF",
      "F635-0000-0166-CCFE",
      "FE81-0000-021B-3387"
  ]
   



  let numProcessed = 0;
  for (const level of remainingLevels) {
    console.error('\n[info] Starting', level, `(${remainingLevels.length - numProcessed} remaining)`)
    await processLevelId(level)
    console.log('\n\n');
    numProcessed++;
  }
}

yeehaw().then(() => process.exit(0)).catch(e => {console.error(e); process.exit(1)});

function processCompressedFiles() {
  const dir = 'H:\\smm1-levels\\new_compressed_files';
  const toProcess = fs.readdirSync(dir)
  // const toProcess = ['569F-0000-0327-A604_compressed']

  toProcess.forEach(file => splitFile(path.join(dir, file)));
}

// processCompressedFiles();