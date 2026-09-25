# 5-Camera CCTV Demonstration

The project includes five small offline demo clips under `public/demo/cctv/`.

| Camera | Institute | Demo activity | Expected context | Result |
|---|---|---|---|---|
| CAM-01 | Divya Jyoti Skill Training Institute | Teaching | Teaching / skill training | MATCH |
| CAM-02 | Divya Jyoti Skill Training Institute | Dancing | Teaching / skill training | SUSPECT |
| CAM-03 | Asha Kiran Shelter Home | Empty room | Counselling / meal service / recreation | SUSPECT |
| CAM-04 | Sahara Old Age Care Project | Crowd | Medical check / meal service / recreation | SUSPECT |
| CAM-05 | Umang Institute for Differently Abled | Staff only | Beneficiary counselling / service delivery | WATCH/SUSPECT |

## Demo flow

1. Login with `admin@dosje.gov.in` / `Admin@123`.
2. Open **CCTV**.
3. Play any clip.
4. Click **AI analyze this footage** or **Analyze all cameras**.
5. The frontend sends the camera's demo activity to `/api/ai-monitoring/scan`.
6. The backend compares it with the institute context profile.
7. An unexpected activity creates an AI event, assigns an inspector, creates an AI-triggered inspection and queues an AI verification call.
8. Open **AI CCTV**, **Inspections**, **AI Calls**, and **Command Center** to show the chain.

The bundled clips are demonstration inputs, not claims of real computer-vision inference. A production deployment can replace the deterministic demo activity with a real vision model while keeping the same backend workflow.
