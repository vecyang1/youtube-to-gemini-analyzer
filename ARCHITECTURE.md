```mermaid
sequenceDiagram
    participant User
    participant YouTube
    participant Popup
    participant Background
    participant Storage
    participant AIStudio
    participant ContentScript

    User->>YouTube: Opens video page
    User->>Popup: Clicks extension icon
    Popup->>Popup: Detects YouTube URL
    Popup->>Background: Send analyzeVideo message
    Background->>Storage: Store video URL + prompt
    Background->>AIStudio: Open new tab
    AIStudio->>ContentScript: Load content script
    ContentScript->>Storage: Retrieve pending analysis
    ContentScript->>ContentScript: Wait for textarea
    ContentScript->>AIStudio: Fill textarea with URL + prompt
    ContentScript->>AIStudio: Click Run button
    ContentScript->>ContentScript: Start heartbeat (5s interval)
    AIStudio->>AIStudio: Process analysis
    ContentScript->>ContentScript: Monitor progress
    AIStudio->>User: Display results
    ContentScript->>ContentScript: Stop heartbeat
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                        Chrome Browser                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   YouTube    │         │  AI Studio   │                  │
│  │     Tab      │         │     Tab      │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         │                        │                           │
│  ┌──────▼───────┐         ┌──────▼───────┐                  │
│  │    Popup     │         │   Content    │                  │
│  │   (UI/UX)    │         │   Script     │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         └────────┬───────────────┘                           │
│                  │                                           │
│           ┌──────▼───────┐                                   │
│           │  Background  │                                   │
│           │    Worker    │                                   │
│           └──────┬───────┘                                   │
│                  │                                           │
│           ┌──────▼───────┐                                   │
│           │   Storage    │                                   │
│           │     API      │                                   │
│           └──────────────┘                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. User Action
   └─> Popup detects YouTube URL
       └─> Sends message to Background

2. Background Processing
   └─> Stores analysis data in chrome.storage
       └─> Opens AI Studio tab

3. Content Script Activation
   └─> Retrieves stored data
       └─> Waits for page load
           └─> Fills textarea
               └─> Clicks Run button
                   └─> Starts heartbeat

4. Heartbeat Loop
   └─> Every 5 seconds:
       └─> Check if analysis running
           └─> Simulate user activity
               └─> Stop when complete
```

## State Machine

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │ User clicks extension
     ▼
┌─────────┐
│ PENDING │ (Data stored)
└────┬────┘
     │ Tab opens
     ▼
┌─────────┐
│ LOADING │ (Content script loads)
└────┬────┘
     │ Textarea found
     ▼
┌─────────┐
│ FILLING │ (Inserting prompt)
└────┬────┘
     │ Run button clicked
     ▼
┌─────────┐
│ RUNNING │ (Heartbeat active)
└────┬────┘
     │ Analysis complete
     ▼
┌─────────┐
│  DONE   │
└─────────┘
```
