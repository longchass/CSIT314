const _ = require("lodash");
const ObjectsToCsv = require('objects-to-csv');
const categories = {
  unitType: ["Cheque", "Credit", "Inventory Item"],
  customerType: ["Business", "Personal", "Government", "Other"],
  status: ["Accepted", "Rejected"],
};

/**
 * Main program
 */
exports.main = async () => {
  const result = this.runAlgorithm(categories, 2, 10000);
  const csv = new ObjectsToCsv(result.executed);
  await csv.toDisk('./executed.csv');
  console.log("Result");
  console.log("==================================================");
  for (let s in result.S) {
    const count = _.get(result.S, s);
    console.log(`${s}: ${count}`);
  }
};

/**
 * Calculates the sum distance between new candidate and previously executed test cases
 * @param {*} cand Candidate
 * @param {*} S Previous count test cases
 * @param {*} n number of test cases
 */
exports.sumDist = (cand, S, n) => {
  let dist = 0;
  let g = 1;
  // Foeach category selected on the candidate
  for (let att in cand) {
    // Get all possible choices for Aith category
    const choices = _.get(categories, att);
    // Get index selected choice
    const i = choices.indexOf(_.get(cand, att)) + 1;
    // Build the key to query from previous test cases
    const key = `s(${g})(${i})`;
    // Get sCount
    let sCount = _.get(S, key);
    // Sum(n - s(g)(i));
    dist += n - sCount;
    g++;
  }
  return dist;
};

/**
 * Runs ARTsum algorithm
 * @param {*} categories Categories
 * @param {*} k number of candidates
 * @param {*} numOfIt number of iterations
 */
exports.runAlgorithm = (categories, k, numOfIt) => {
  // Initialise S count to 0
  let S = {};
  let x = 1;
  // Foreach category available
  for (let category in categories) {
    let ccKey = `s(${x})`;
    let choices = _.get(categories, category);
    // Foreach choice (includes 0)
    for (let j = 0; j <= choices.length; j++) {
      let chKey = `${ccKey}(${j})`;
      _.set(S, chKey, 0);
    }
    x++;
  }
  // Set n = 0 and E = {}
  let n = 0;
  let E = [];
  while (n < numOfIt) {
    n++;
    let en = {};
    if (n == 1) {
      // Randomly generates a test case
      en = {
        unitType: _.sample(categories.unitType),
        customerType: _.sample(categories.customerType),
        status: _.sample(categories.status),
      };
    } else {
      // Randomly generates k candidates c1, c2, ..., ck
      let highestDist = 0;
      for (let i = 0; i < k; i++) {
        // Calculate sum_dist(cu, E) according to equation (3)
        // 1. Generates candidate
        const c = {
          unitType: _.sample(categories.unitType),
          customerType: _.sample(categories.customerType),
          status: _.sample(categories.status),
        };
        // Calculate the distance between candidate and S
        const dist = this.sumDist(c, S, n);
        // If the distance is higher, replace
        if (dist >= highestDist) {
          highestDist = dist;
          en = c;
        }
      }
    }
    // Add en into E
    E.push(en);
    // Update S by incrementing each s1r1en by 1. where i = 1,2,,..., g
    let c = 1;
    for (let att in en) {
      // Get possible choices of category
      const choices = _.get(categories, att);
      // Get the selected choice index
      const i = choices.indexOf(_.get(en, att)) + 1;
      // Build key
      const key = `s(${c})(${i})`;
      // Get current count of the key
      let curr = _.get(S, key);
      // Increment count
      curr++;
      // Set
      _.set(S, key, curr);
      c++;
    }
  }

  return {
    executed: E,
    S: S
  };
};

/**
 * Spits out the executed test cases into csv file
 * @param E executed test cases
 */
// exports.toCsv = (E) => {
//   let row = "";
//   let str = "";
//   const e = E.length > 0 ? E[0] : null;
//   Object.keys(e).forEach((key) => {
//     row += key + ",";
//   });
//   row = row.slice(0, -1);
//   str += row + "\r\n";
//   for (let e of E) {
//     let line = "";
//     for (let att in e) {
//       const value = _.get(e, att);
//       line += value + ",";
//     }
//     line = line.slice(0, -1);
//     str += line + "\r\n";
//   }
//   return str;
// };

this.main();
