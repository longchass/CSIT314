import { Injectable } from "@angular/core";
import * as _ from "lodash";

@Injectable()
export class ARTRTCalculationService {
  constructor() {}

  generateRT = (categories) => {
    const en = {};
    for (let item of categories) {
      const choices = item.choices;
      const selectedChoice = _.sample(choices);
      _.set(en, item.category, selectedChoice);
    }
    return en;
  };

  sumDist = (categories: any[], cand: any, S: any, n: number) => {
    let dist = 0;
    let g = 1;
    // Foeach category selected on the candidate
    for (let att in cand) {
      // Get all possible choices for Aith category
      const choices = categories.find((item) => item.category == att)?.choices;
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

  runAlgorithm = (
    numberOfCom: number,
    categories: any[],
    failureRegion: any[]
  ) => {
    // console.log("Possible combination: " + numOfPos);
    // console.log("Failure Rate: " + failureRate);
    // console.log("Number of iteration: " + numberOfIt);
    // console.log("Number of failure: " + failureCount);
    const artFCount = [];
    const rtFCount = [];
    let artWinCount = 0;
    let rtWinCount = 0;
    let currCom = 0;
    while (currCom < numberOfCom) {
      currCom++;
      // console.log("=======");
      // Setup ART
      let S = {};
      let x = 1;
      // Foreach category available
      for (let item of categories) {
        let ccKey = `s(${x})`;
        let choices = item.choices;
        // Foreach choice (includes 0)
        for (let j = 0; j <= choices.length; j++) {
          let chKey = `${ccKey}(${j})`;
          _.set(S, chKey, 0);
        }
        x++;
      }
      // let hit = false;
      let RTHit = false;
      let ARTHit = false;
      let n = 0;
      let E = [];
      let k = 10;
      while (RTHit === false || ARTHit === false) {
        if (RTHit && ARTHit) break;
        n++;
        // console.log("=======");

        // console.log("Iteration: " + n);
        // Generate RT
        const enRT = this.generateRT(categories);
        // Generate ART
        let enART = {};
        if (n == 1) {
          // Randomly generates a test case
          for (let item of categories) {
            const choices = item.choices;
            _.set(enART, item.category, _.sample(choices));
          }
        } else {
          // Randomly generates k candidates c1, c2, ..., ck
          let highestDist = 0;
          for (let i = 0; i < k; i++) {
            // Calculate sum_dist(cu, E) according to equation (3)
            // 1. Generates candidate
            const c = {};
            for (let item of categories) {
              const choices = item.choices;
              _.set(c, item.category, _.sample(choices));
            }
            // Calculate the distance between candidate and S
            const dist = this.sumDist(categories, c, S, n);
            // If the distance is higher, replace
            if (dist >= highestDist) {
              highestDist = dist;
              enART = c;
            }
          }
        }
        // Add en into E
        E.push(enART);
        // Update S by incrementing each s1r1en by 1. where i = 1,2,,..., g
        let c = 1;
        for (let att in enART) {
          // Get possible choices of category
          const choices = categories.find((item) => item.category == att)
            ?.choices;
          // Get the selected choice index
          const i = choices.indexOf(_.get(enART, att)) + 1;
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
        // Check failure rate
        if (
          failureRegion.find(
            (item) => JSON.stringify(item) === JSON.stringify(enRT)
          ) &&
          RTHit === false
        ) {
          // console.log("RT Hit At " + n);
          rtFCount.push(n);
          // console.log(`RUN ${currCom}: RT Hit at ${n} Iteration`);
          RTHit = true;
          if (ARTHit === false) {
            // RT Win
            rtWinCount++;
          }
          // break;
        }
        if (
          failureRegion.find(
            (item) => JSON.stringify(item) === JSON.stringify(enART)
          ) &&
          ARTHit === false
        ) {
          // console.log("ART Hit At " + n);
          artFCount.push(n);
          // console.log(`RUN ${currCom}: ART Hit at ${n} Iteration`);
          ARTHit = true;
          if (RTHit === false) {
            // ART Win
            artWinCount++;
          }
          // break;
        }
        // console.log("=======");
      }
      // console.log("=======");
    }
    return {
      artFCount: artFCount,
      rtFCount: rtFCount,
      artWinCount: artWinCount,
      rtWinCount: rtWinCount,
    };
  };

  run = (input) => {
    // ART and RT Calculation
    // Generate failure region
    const failureCount = Math.floor(input.failureRate * input.numOfPos);
    const failureRegion = this.generateFailureRegion(failureCount, input.categories);
    console.log("Running Algorithm...");
    console.log("=================================================");
    console.log("Possible categories and choices combination: " + input.numOfPos);
    console.log("Failure Rate: " + input.failureRate);
    console.log("Number of failure: " + failureCount);
    console.log("Number of run: " + input.numberOfCom);
    console.log("=================================================");
    // Run algorithm
    const result = this.runAlgorithm(
      input.numberOfCom,
      input.categories,
      failureRegion
    );
    return result;
  }

  generateFailureRegion = (failureCount: number, categories: any[]) => {
    const failureRegion = [];
    for (let i = 0; i < failureCount; i++) {
      let en = this.generateRT(categories);
      while (
        failureRegion.find(
          (item) => JSON.stringify(item) === JSON.stringify(en)
        )
      )
        en = this.generateRT(categories);
      failureRegion.push(en);
    }
    return failureRegion;
  };
}
