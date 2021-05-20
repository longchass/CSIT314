/// <reference lib="webworker" />

import * as _ from "lodash";
import combinate from "combinate";

const allPossibleCases = (arr) => {
  if (arr.length == 1) {
    return arr[0];
  } else {
    const result = [];
    const allCasesOfRest = allPossibleCases(arr.slice(1)); // recur with the rest of array
    for (var i = 0; i < allCasesOfRest.length; i++) {
      for (var j = 0; j < arr[0].length; j++) {
        result.push(arr[0][j] + "," + allCasesOfRest[i]);
      }
    }
    return result;
  }
};

const getPossibleCombinations = (categories): any[] => {
  const options = {};
  categories.forEach((item) => _.set(options, item.category, item.choices));
  const allPossibleCases = combinate(options);
  return allPossibleCases;
};

const sumDist = (categories: any[], cand: any, S: any, n: number) => {
  let dist = 0;
  const atts = Object.keys(cand);
  for (let i = 0; i < atts.length; i++) {
    // Get all possible choices for Aith category
    const choices = categories.find((item) => item.category === atts[i])
      ?.choices;
    // Get index selected choice
    const j = choices.indexOf(_.get(cand, atts[i])) + 1;
    let sCount = S[i][j];
    dist += n - sCount;
  }
  return dist;
};

const runAlgorithm = (
  numberOfCom: number,
  categories: any[],
  failureRegion: any[],
  allCases: any[]
) => {
  // console.log("Possible combination: " + numOfPos);
  // console.log("Failure Rate: " + failureRate);
  // console.log("Number of iteration: " + numberOfIt);
  // console.log("Number of failure: " + failureCount);
  const artFCount = [];
  const rtFCount = [];
  let artWinCount = 0;
  let rtWinCount = 0;
  let drawCount = 0;
  let currCom = 0;
  while (currCom < numberOfCom) {
    currCom++;

    let S = [];
    for (let i = 0; i < categories.length; i++) {
      S[i] = [];
      // Foreach choice (includes 0)
      for (let j = 0; j <= categories[i].choices.length; j++) S[i][j] = 0;
    }

    let rtHit = false;
    let artHit = false;
    let n = 0;
    let E = [];
    let k = 10;
    let max = allCases.length * 0.1;
    while (n < max) {
      n++;
      // Generate
      let en = _.sample(allCases);
      let enRT = _.sample(allCases);
      if (n > 1) {
        let highestDist = 0;
        for (let i = 0; i < k; i++) {
          // Calculate sum_dist(cu, E) according to equation (3)
          // 1. Generates candidate
          const c = _.sample(allCases);
          // Calculate the distance between candidate and S
          const dist = sumDist(categories, c, S, n);
          // If the distance is higher, replace
          if (dist >= highestDist) {
            highestDist = dist;
            en = c;
          }
        }
      }

      E.push(en);
      // Update S by incrementing each s1r1en by 1. where i = 1,2,,..., g
      const atts = Object.keys(en);
      for (let i = 0; i < atts.length; i++) {
        // Get all possible choices for Aith category
        const choices = categories.find((item) => item.category == atts[i])
          ?.choices;
        // Get index selected choice
        const j = choices.indexOf(_.get(en, atts[i])) + 1;
        S[i][j]++;
      }

      const artFound = failureRegion.find((item) => _.isEqual(item, en));
      const rtFound = failureRegion.find((item) => _.isEqual(item, enRT));

      // Draw
      if (rtFound && artFound && !artHit && !rtHit) {
        // console.log("Draw at: " + n);
        artHit = true;
        rtHit = true;
        artFCount.push(n);
        rtFCount.push(n);
        drawCount++;
        postMessage({ type: "draw_update", drawCount: drawCount });
        break;
      }

      // ART Win
      if (artFound && !artHit && !rtFound) {
        // console.log("Hit ART at: " + n);
        artHit = true;
        if (!rtHit) artWinCount++;
        artFCount.push(n);
        postMessage({ type: "art_win_update", artWinCount: artWinCount });
      }

      // RT Win
      if (rtFound && !rtHit && !artFound) {
        // console.log("Hit RT at: " + n);
        rtHit = true;
        if (!artHit) rtWinCount++;
        rtFCount.push(n);
        postMessage({ type: "rt_win_update", rtWinCount: rtWinCount });
      }

      if (rtHit && artHit) break;
    }

    if (!artHit && !rtHit) {
      artHit = true;
      rtHit = true;
      artFCount.push(n);
      rtFCount.push(n);
      drawCount++;
      postMessage({ type: "draw_update", drawCount: drawCount });
    }
  }

  return {
    artFCount: artFCount,
    rtFCount: rtFCount,
    artWinCount: artWinCount,
    rtWinCount: rtWinCount,
    drawCount: drawCount,
  };
};

const generateFailureRegion = (failureCount: number, categories: any[]) => {
  // Generate first failure region
  const allCases = getPossibleCombinations(categories);
  console.log("all cases length: " + allCases.length);
  const numOfFor = Math.round(failureCount / 2) - 1;
  const numOfBack = Math.floor(failureCount / 2);
  console.log("Num of Back", numOfBack);
  console.log("Num of for", numOfFor);
  console.log(
    "Random: (",
    numOfBack + 1,
    ", ",
    allCases.length - numOfFor,
    ")"
  );
  const enIndex = _.random(numOfBack + 1, allCases.length - numOfFor);
  let failureRegion = [];
  console.log("En index: " + enIndex);
  // Push current
  failureRegion.push(allCases[enIndex - 1]);
  // Traverse forward
  for (let i = enIndex + 1; i <= numOfFor + enIndex; i++)
    failureRegion.push(allCases[i - 1]);
  // Traverse backward
  for (let i = enIndex - 1; i >= enIndex - numOfBack; i--)
    failureRegion.push(allCases[i - 1]);
  failureRegion = _.uniqWith(failureRegion, _.isEqual);
  console.log("region length: ", failureRegion.length);
  console.log("Is equal: " + _.isEqualWith(failureRegion, allCases, _.isEqual));
  return failureRegion;
};

addEventListener("message", ({ data }) => {
  const input = JSON.parse(data);
  // ART and RT Calculation
  // Generate failure region
  const failureCount = input?.failureRegion?.length || Math.floor(input.failureRate * input.numOfPos);
  const failureRegion = input?.failureRegion || generateFailureRegion(failureCount, input.categories);
  const allCases = input?.posCases || getPossibleCombinations(input.categories);
  console.log(failureRegion);
  console.log(allCases);
  console.log("Running Algorithm...");
  console.log("=================================================");
  console.log("Possible categories and choices combination: " + input.numOfPos);
  console.log("Failure Rate: " + input.failureRate);
  console.log("Number of failure: " + failureCount);
  console.log("Number of run: " + input.numberOfCom);
  console.log("=================================================");
  // Run algorithm
  const result = runAlgorithm(
    input.numberOfCom,
    input.categories,
    failureRegion,
    allCases
  );
  postMessage({ type: "final", result: result });
});
