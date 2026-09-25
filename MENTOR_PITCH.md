# SIH Mentor Pitch — What is unique in our solution?

## 30-second answer

> “The base problem gives monitoring tools separately. Our uniqueness is an evidence-fusion intelligence layer. We create an expected-behaviour profile for every NGO/institute based on its scheme. CCTV activity is compared with that profile. If the observed activity is unusual, the system generates an explainable AI alert, combines it with citizen evidence and past inspection history, and can automatically create a surprise inspection for an inspector. So the system moves from passive monitoring to proactive, context-aware inspection.”

## Example

For a Skill Training Institute:

- Expected: skill training, teaching, counselling.
- CCTV intelligence: dancing detected.
- Result: context mismatch → confidence score → explainable reason → suspect queue.
- If confidence is high: surprise inspection is automatically created and an inspector is assigned.
- If a citizen/staff member also submits “no training is happening” with a marked photo, that becomes a corroborating signal.
- Final decision stays with the department inspector: AI is a lead generator, not a judge.

## Strong differentiators

### 1. Context-aware CCTV, not only object detection
Traditional CCTV monitoring asks “what is visible?”. Our layer asks “is what is visible appropriate for this project?”.

### 2. Multi-source evidence fusion
CCTV + community report + previous inspection anomalies are combined into one priority signal.

### 3. Automatic closed-loop escalation
Detection → explanation → inspector assignment → inspection → geo/evidence capture → review.

### 4. Citizen evidence with annotation
A user can capture a photo, draw a circle around the suspicious area and write what they observed.

### 5. Explainable AI
Every alert stores observed activity, expected activities, confidence, severity, reasons and recommended action.

### 6. Human-in-the-loop governance
The system never declares an NGO guilty from one camera event. It creates an inspection lead for a human officer.

### 7. Adaptive risk scoring
The same institute can become higher priority when multiple independent signals accumulate.

## If mentor asks “Is this real AI?”

For the hackathon prototype, the included engine is a deterministic demo inference layer so the product works without an external AI key. The architecture is intentionally separated so a real computer-vision model can replace the demo activity input without changing the escalation workflow.

Use the phrase **“AI-assisted context-aware anomaly detection”** for the prototype.

## 2-minute live demo

1. Login as Admin.
2. Open **AI CCTV**.
3. Choose **Divya Jyoti Skill Training Institute**.
4. Choose **Dancing** as observed activity.
5. Click **Analyze frame**.
6. Show the context mismatch, confidence and inspector assignment.
7. Open **Inspections** and show the automatically created `ai_triggered` inspection.
8. Open **Public Reports** and create a report with a photo; draw a circle around the issue.
9. Open **Command Center** and show the escalation queue and live activity.
10. Explain that the real deployment can feed actual CCTV frames into the same intelligence layer.
