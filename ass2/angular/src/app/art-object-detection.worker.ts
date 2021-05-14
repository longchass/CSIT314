/// <reference lib="webworker" />

import * as _ from "lodash";
import combinate from "combinate";
import { environment } from "../environments/environment";

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
  // const atts = Object.keys(cand);
  for (let i = 0; i < categories.length; i++) {
    // Get all possible choices for Aith category
    const choices = categories[i]?.choices;
    const catName = categories[i]?.category;
    const j = choices.indexOf(_.get(cand, catName)) + 1;
    let sCount = S[i][j];
    dist += n - sCount;
  }

  // for (let i = 0; i < atts.length; i++) {
  //   // Get all possible choices for Aith category
  //   const choices = categories.find((item) => item.category === atts[i])
  //     ?.choices;
  //   // Get index selected choice
  //   const j = choices.indexOf(_.get(cand, atts[i])) + 1;
  //   let sCount = S[i][j];
  //   dist += n - sCount;
  // }
  return dist;
};

export const runAlgorithm = async (
  numberOfCom: number,
  categories: any[],
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
      // const atts = Object.keys(en);
      for (let i = 0; i < categories.length; i++) {
        // Get all possible choices for Aith category
        const choices = categories[i]?.choices;
        const catName = categories[i]?.category;
        const j = choices.indexOf(_.get(en, catName)) + 1;
        S[i][j]++;
      }

      // for (let i = 0; i < atts.length; i++) {
      //   // Get all possible choices for Aith category
      //   const choices = categories.find((item) => item.category == atts[i])
      //     ?.choices;
      //   if (!choices) continue;
      //   // Get index selected choice
      //   const j = choices.indexOf(_.get(en, atts[i])) + 1;
      //   S[i][j]++;
      // }

      // Test oracle for both ART and RT
      const artResult = await predict(en.Url);
      const artResultFaulty = await predictFaulty(en.Url);
      const isArtFail = isResultFaulty(artResult, artResultFaulty);
      console.log("ART Fail: " + isArtFail);
      postMessage({
        type: "art_image_update",
        artResult: artResult,
        artResultFaulty: artResultFaulty,
        isArtFail: isArtFail,
      });

      const rtResult = await predict(enRT.Url);
      const rtResultFaulty = await predictFaulty(enRT.Url);
      const isRtFail = isResultFaulty(rtResult, rtResultFaulty);
      console.log("RT Fail: " + isRtFail);
      postMessage({
        type: "rt_image_update",
        rtResult: rtResult,
        rtResultFaulty: rtResultFaulty,
        isRtFail: isRtFail,
      });

      // Draw
      if (isRtFail && isArtFail && !artHit && !rtHit) {
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
      if (isArtFail && !artHit && !isRtFail) {
        // console.log("Hit ART at: " + n);
        artHit = true;
        if (!rtHit) artWinCount++;
        artFCount.push(n);
        postMessage({ type: "art_win_update", artWinCount: artWinCount });
      }

      // RT Win
      if (isRtFail && !rtHit && !isArtFail) {
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

    console.log("S: ");
    console.log(S);
  }

  return {
    artFCount: artFCount,
    rtFCount: rtFCount,
    artWinCount: artWinCount,
    rtWinCount: rtWinCount,
    drawCount: drawCount,
  };
};

export const isResultFaulty = (result: any, faultyResult: any): boolean => {
  if (!result || !faultyResult) return true;
  const numOfObj = result?.object_detected?.length;
  const numOfFaultyObj = faultyResult?.object_detected?.length;
  const tolerance = 100;
  if (numOfObj !== numOfFaultyObj) return true;
  else {
    let i = 0;
    for (let obj of result?.object_detected) {
      const xMaxNormal = Number(obj.coord.x_max);
      const xMinNormal = Number(obj.coord.x_min);
      const yMaxNormal = Number(obj.coord.y_max);
      const yMinNormal = Number(obj.coord.y_min);
      const xMaxFaulty = Number(faultyResult.object_detected[i].coord.x_max);
      const xMinFaulty = Number(faultyResult.object_detected[i].coord.x_min);
      const yMaxFaulty = Number(faultyResult.object_detected[i].coord.y_max);
      const yMinFaulty = Number(faultyResult.object_detected[i].coord.y_min);
      // Compare
      if (
        xMaxFaulty < xMaxNormal - tolerance ||
        xMaxFaulty > xMaxNormal + tolerance
      )
        return true;
      if (
        xMinFaulty < xMinNormal - tolerance ||
        xMinFaulty > xMinNormal + tolerance
      )
        return true;
      if (
        yMaxFaulty < yMaxNormal - tolerance ||
        yMaxFaulty > yMaxNormal + tolerance
      )
        return true;
      if (
        yMinFaulty < yMinNormal - tolerance ||
        yMinFaulty > yMinNormal + tolerance
      )
        return true;
      i++;
    }
    return false;
  }
};

export const predictFaulty = async (imageUrl: string) => {
  try {
    const result = await fetch(`${environment.apiBaseUrl}/predict-faulty`, {
      body: JSON.stringify({
        image_path: imageUrl,
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const jsonResult = await result.json();
    return jsonResult;
  } catch {
    return null;
  }
};

export const predict = async (imageUrl: string) => {
  try {
    const result = await fetch(`${environment.apiBaseUrl}/predict`, {
      body: JSON.stringify({
        image_path: imageUrl,
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const jsonResult = await result.json();
    return jsonResult;
  } catch {
    return null;
  }
};

addEventListener("message", async ({ data }) => {
  const input = JSON.parse(data);
  // ART and RT Calculation
  // Generate failure region
  const allCases = input?.posCases;
  console.log(allCases);
  console.log("Running Algorithm...");
  console.log("=================================================");
  console.log(
    "Possible categories and choices combination: " + allCases?.length
  );
  console.log("Number of run: " + input?.numberOfCom);
  console.log("=================================================");
  // Run algorithm
  const result = await runAlgorithm(
    input.numberOfCom,
    input.categories,
    allCases
  );
  postMessage({ type: "final", result: result });
});
