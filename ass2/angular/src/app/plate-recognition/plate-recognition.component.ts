import { Component, OnInit } from "@angular/core";
import { ColumnApi, GridApi } from "ag-grid-community";
import { ObjectDetectionService } from "../services/object-detection.service";
import * as XLSX from "xlsx";
import * as Enumerable from "linq";
// import * as ObjDetection from "../art-object-detection.worker";

@Component({
  selector: "app-plate-recognition",
  templateUrl: "./plate-recognition.component.html",
  styleUrls: ["./plate-recognition.component.scss"],
})
export class PlateRecognitionComponent implements OnInit {
  imageUrl: string;
  imageResultUrl: string;
  imageResultFaultyUrl: string;
  artImageResultUrl: string;
  artFaultyImageResultUrl: string;
  rtImageResultUrl: string;
  rtFaultyImageResultUrl: string;
  artFail: boolean;
  rtFail: boolean;
  faultyOrNot: string;
  imageResult: any;
  imageResultFaulty: any;
  rtWinCount: number = 0;
  artWinCount: number = 0;
  drawCount: number = 0;
  categories: any[] = [
    {
      category: "PictureMode",
      choices: ["FullBody", "Half", "PlateOnly"],
    },
    {
      category: "PlateColor",
      choices: ["Green", "Black", "White", "Yellow"],
    },
    {
      category: "Angle",
      choices: ["Left", "Middle", "Right"],
    },
    {
      category: "NumberOfPlates",
      choices: ["One", "Two", "Three"],
    },
    {
      category: "VehicleType",
      choices: ["Sedan", "SUV", "Bike", "Hatchback", "None"],
    },
  ];
  displayedColumns = ["category", "choices"];
  boxPlotGraph: any = {
    data: [],
    layout: { autosize: true, title: "ART vs RT" },
  };
  lineGraph: any = {
    data: [],
    layout: { autosize: true, title: "ART vs RT" },
  };
  loading = false;
  loadingTest = false;
  plateData: any;
  numberOfCom: number = 5;
  plateRecognitionWorker: Worker;

  constructor(private objectDetectionService: ObjectDetectionService) {}

  async test() {
    this.loadingTest = true;
    const result = await this.objectDetectionService
      .predict(this.imageUrl)
      .toPromise();
    const faultyResult = await this.objectDetectionService
      .predictFaulty(this.imageUrl)
      .toPromise();
    this.imageResultUrl = result.result_url;
    this.imageResultFaultyUrl = faultyResult.result_url;
    this.imageResult = result;
    this.imageResultFaulty = faultyResult;
    this.loadingTest = false;
  }

  run() {
    this.loading = true;
    if (!this.plateData || !this.categories) {
      alert("Please enter the input file!");
      this.loading = false;
      return;
    }
    if (typeof Worker !== "undefined") {
      // Create a new
      this.plateRecognitionWorker = new Worker(
        "../art-object-detection.worker",
        {
          type: "module",
        }
      );
      this.plateRecognitionWorker.onmessage = ({ data }) => {
        if (data.type === "final") {
          console.log("Result");
          console.log(data);
          const artFCount = data.result.artFCount;
          const rtFCount = data.result.rtFCount;
          this.artWinCount = data.result.artWinCount;
          this.rtWinCount = data.result.rtWinCount;
          this.setupBoxPlotGraph(artFCount, rtFCount);
          this.setupLineGraph(artFCount, rtFCount);
          this.loading = false;
        } else if (data.type === "art_win_update") {
          this.artWinCount = data.artWinCount;
        } else if (data.type === "rt_win_update") {
          this.rtWinCount = data.rtWinCount;
        } else if (data.type === "draw_update") {
          this.drawCount = data.drawCount;
        } else if (data.type === "art_image_update") {
          const artResult = data.artResult;
          const artResultFaulty = data.artResultFaulty;
          const isArtFail = data.isArtFail;
          this.artImageResultUrl = artResult?.result_url;
          this.artFaultyImageResultUrl = artResultFaulty?.result_url;
          this.artFail = isArtFail;
        } else if (data.type === "rt_image_update") {
          const rtResult = data.rtResult;
          const rtResultFaulty = data.rtResultFaulty;
          const isRtFail = data.isRtFail;
          this.rtImageResultUrl = rtResult?.result_url;
          this.rtFaultyImageResultUrl = rtResultFaulty?.result_url;
          this.rtFail = isRtFail;
        }
      };

      const workerInput = {
        categories: this.categories,
        numberOfCom: this.numberOfCom,
        posCases: this.plateData,
      };
      this.plateRecognitionWorker.postMessage(JSON.stringify(workerInput));
    } else {
      // Web workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  cancelRun() {
    this.plateRecognitionWorker.terminate();
    this.loading = false;
  }

  setupLineGraph(artFCount: number[], rtFCount: number[]) {
    // Setup box plot
    const artBoxPlotData = {
      y: artFCount,
      type: "scatter",
      name: "ART",
    };
    const rtBoxPlotData = {
      y: rtFCount,
      type: "scatter",
      name: "RT",
    };
    const graph = {
      data: [artBoxPlotData, rtBoxPlotData],
      layout: { title: "ART vs RT (F-Measure)", autosize: true },
    };
    this.lineGraph = graph;
  }

  setupBoxPlotGraph(artFCount: number[], rtFCount: number[]) {
    // Setup box plot
    const artBoxPlotData = {
      x: artFCount,
      type: "box",
      name: "ART",
    };
    const rtBoxPlotData = {
      x: rtFCount,
      type: "box",
      name: "RT",
    };
    const graph = {
      data: [artBoxPlotData, rtBoxPlotData],
      layout: { autosize: true, title: "ART vs RT (F-Measure)" },
    };
    this.boxPlotGraph = graph;
  }

  onFileChange(event: any) {
    /* wire up file reader */
    const target: DataTransfer = <DataTransfer>event.target;
    if (target.files.length !== 1) {
      throw new Error("Cannot use multiple files");
    }
    const reader: FileReader = new FileReader();
    reader.readAsBinaryString(target.files[0]);
    reader.onload = (e: any) => {
      /* create workbook */
      const binarystr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(binarystr, { type: "binary" });

      // Select Data sheet
      const dataWorksheet = wb.Sheets["Data"];
      const catWorksheet = wb.Sheets["Categories"];

      // Read Data sheet
      const data = XLSX.utils.sheet_to_json(dataWorksheet);
      const categories: any[] = XLSX.utils.sheet_to_json(catWorksheet);

      this.categories = Enumerable.from(categories)
        .select((x) => {
          const choices = String(x.Choices)
            .split(",")
            .map((c) => c.trim());
          return {
            category: x.Category,
            choices: choices,
          };
        })
        .toArray();

      this.plateData = Enumerable.from(data).take(25).toArray();

      console.log("Data: ");
      console.log(this.plateData);

      console.log("Categories");
      console.log(this.categories);
    };
  }

  ngOnInit() {}
}
