import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ObjectDetectionService {
  constructor(private http: HttpClient) {}

  public predict(url: string) {
    const generateFromSeedInput = {
      image_path: url,
    };
    return this.http.post<any>(
      `${environment.apiBaseUrl}/predict`,
      generateFromSeedInput,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  public predictFaulty(url: string) {
    const generateFromSeedInput = {
      image_path: url,
    };
    return this.http.post<any>(
      `${environment.apiBaseUrl}/predict-faulty`,
      generateFromSeedInput,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
