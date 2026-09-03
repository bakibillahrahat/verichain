const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractsDir = path.resolve(__dirname, '../contracts');
const buildDir = path.resolve(__dirname, '../build/contracts');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const contractFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));

const sources = {};
for (const file of contractFiles) {
  sources[file] = {
    content: fs.readFileSync(path.join(contractsDir, file), 'utf8')
  };
}

const input = {
  language: 'Solidity',
  sources: sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
      }
    }
  }
};

console.log(`Compiling ${contractFiles.length} contracts with solc v${solc.version()}...`);
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  for (const error of output.errors) {
    if (error.severity === 'error') {
      hasError = true;
      console.error(`\x1b[31m[ERROR]\x1b[0m ${error.formattedMessage}`);
    } else {
      console.warn(`\x1b[33m[WARNING]\x1b[0m ${error.formattedMessage}`);
    }
  }
  if (hasError) {
    process.exit(1);
  }
}

let compiledCount = 0;
for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [contractName, artifact] of Object.entries(contracts)) {
    const artifactPath = path.join(buildDir, `${contractName}.json`);
    const data = {
      contractName: contractName,
      abi: artifact.abi,
      bytecode: artifact.evm.bytecode.object,
      deployedBytecode: artifact.evm.deployedBytecode.object,
      compiler: {
        name: 'solc',
        version: solc.version()
      }
    };
    fs.writeFileSync(artifactPath, JSON.stringify(data, null, 2));
    compiledCount++;
    console.log(`✓ Compiled & saved: ${contractName}`);
  }
}

console.log(`\nSuccessfully compiled ${compiledCount} contract artifacts into ${buildDir}`);

