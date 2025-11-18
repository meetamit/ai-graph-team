import type { GraphNodeMessageGroup } from '@/lib/graph-schema';

export const emptyMessages: GraphNodeMessageGroup[] = [];

export const imageGenerationMessages: GraphNodeMessageGroup[] = [
  {
    nodeId: "image_generator",
    messages: [
      {
        role: "system",
        content: "You are a node in a DAG-based workflow. You must return a single JSON object. If required inputs are missing, request them using the available tools."
      },
      {
        role: "user",
        content: [
          {
            text: "## Node JSON",
            type: "text"
          },
          {
            text: '{"id":"image_generator","name":"Imager","type":"llm","intent":"Generate an provided prompt.","output_schema":{"type":"object","properties":{"file":{"type":"object","required":["id","uri","filename","mediaType"],"properties":{"id":{"type":"string","description":"The id of the file"},"uri":{"type":"string","description":"The URI of the file"},"filename":{"type":"string","description":"The filename of the file"},"mediaType":{"type":"string","description":"The media type of the file"}}}}}}',
            type: "text"
          },
          {
            text: "## Upstream Inputs JSON",
            type: "text"
          },
          {
            text: '{"user_input":{"data":{"prompt":"A whimsical flying house floating in a bright blue sky, surrounded by fluffy white clouds. The house has colorful balloons tied to it that give it an uplifting and cheerful look. Below, there is a picturesque landscape of green fields and a river winding through it."},"message":"Successfully generated an image of a flying house!"}}',
            type: "text"
          }
        ]
      },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            input: {
              size: "1024x1024",
              style: "vivid",
              prompt: "A whimsical flying house floating in a bright blue sky, surrounded by fluffy white clouds. The house has colorful balloons tied to it that give it an uplifting and cheerful look. Below, there is a picturesque landscape of green fields and a river winding through it.",
              quality: "hd",
              filename: "flying_house.png"
            },
            toolName: "generateImage",
            toolCallId: "call_dKhG7fCPHtU7aAqNHfPy65OT",
          }
        ]
      }
    ]
  },
  {
    nodeId: "image_generator",
    messages: [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            output: {
              type: "json",
              value: {
                id: "a718a7fc-050f-4dd0-b5e5-a88d8a9e3d45",
                uri: "file:///Users/amit/projects/ai-graph-team/packages/runner/.run-files/runs/019a7a88-0418-7569-a5f0-a92f70fceebc/a718a7fc-050f-4dd0-b5e5-a88d8a9e3d45__flying_house.png",
                kind: "generated",
                bytes: 1650865,
                runId: "019a7a88-0418-7569-a5f0-a92f70fceebc",
                nodeId: "image_generator",
                sha256: "c926b9949c57119835d0d60b6f5386bdadd5b35ca81928f17281dc3386b201f0",
                filename: "flying_house.png",
                metadata: {
                  size: "1024x1024",
                  model: {
                    config: {
                      provider: "openai.image"
                    },
                    modelId: "dall-e-3",
                    specificationVersion: "v3"
                  },
                  style: "vivid",
                  prompt: "A whimsical flying house floating in a bright blue sky, surrounded by fluffy white clouds. The house has colorful balloons tied to it that give it an uplifting and cheerful look. Below, there is a picturesque landscape of green fields and a river winding through it.",
                  quality: "hd",
                  warnings: [],
                  revisedPrompt: "Imagine a scene of a whimsical house floating in the midair against the background of a bright blue sky dotted with fluffy white clouds. The house appears to be flying, tied with an assortment of colorful balloons that lend it an uplifting and cheerful look. Underneath the airborne house, there unfolds a picturesque landscape dominated by verdant green fields, and a silver-blue river meanders its way through the expanse. The overall image radiates a sense of frivolity and joyous adventure."
                },
                createdAt: "2025-11-13T00:06:50.144Z",
                mediaType: "image/png"
              }
            },
            toolName: "generateImage",
            toolCallId: "call_dKhG7fCPHtU7aAqNHfPy65OT"
          }
        ]
      }
    ],
  },
  {
    nodeId: "image_generator",
    messages: [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            input: {
              data: {
                file: {
                  id: "a718a7fc-050f-4dd0-b5e5-a88d8a9e3d45",
                  uri: "file:///Users/amit/projects/ai-graph-team/packages/runner/.run-files/runs/019a7a88-0418-7569-a5f0-a92f70fceebc/a718a7fc-050f-4dd0-b5e5-a88d8a9e3d45__flying_house.png",
                  filename: "flying_house.png",
                  mediaType: "image/png"
                }
              },
              message: "Successfully generated an image of a whimsical flying house!"
            },
            toolName: "resolveOutput",
            toolCallId: "call_lbNV5PnqofpWUio3R93jGYbN",
          }
        ]
      }
    ]
  },
  {
    nodeId: "image_generator",
    messages: [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            output: {
              type: "json",
              value: {
                data: {
                  file: {
                    id: "a718a7fc-050f-4dd0-b5e5-a88d8a9e3d45",
                    uri: "file:///Users/amit/projects/ai-graph-team/packages/runner/.run-files/runs/019a7a88-0418-7569-a5f0-a92f70fceebc/a718a7fc-050f-4dd0-b5e5-a88d8a9e3d45__flying_house.png",
                    filename: "flying_house.png",
                    mediaType: "image/png"
                  }
                },
                message: "Successfully generated an image of a whimsical flying house!"
              }
            },
            toolName: "resolveOutput",
            toolCallId: "call_lbNV5PnqofpWUio3R93jGYbN"
          }
        ]
      }
    ]
  }
];