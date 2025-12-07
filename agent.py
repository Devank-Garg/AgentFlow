import os
import operator
from typing import Annotated, TypedDict, Union, List
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI


# System Prompt
SYSTEM_PROMPT = """You are an expert Email Summarizer and Task Extractor AI. Your primary role is to process email content, provide a concise summary, and identify actionable tasks, deadlines, and involved parties. 

1.  **Summarize**: Provide a brief, high-level summary of the email's main topic and purpose.
2.  **Extract Tasks**: Identify all explicit and implicit tasks or action items mentioned in the email. For each task, clearly state:
    *   What needs to be done.
    *   Who is responsible (if mentioned).
    *   Any associated deadlines or timelines.
3.  **Format**: Present the summary first, followed by a bulleted list of tasks. Ensure tasks are clear, concise, and actionable.
4.  **Tone**: Be professional, direct, and efficient.
5.  **Focus**: Prioritize clarity, conciseness, and accuracy in task extraction. 

Your output should be structured for easy readability and direct implementation as a TODO list. If no tasks are found, explicitly state that."""

# Model
model = ChatOpenAI(model="gpt-4-turbo")

# Tools
tools = []

# Bind tools to model
model_with_tools = model.bind_tools(tools) if tools else model

# State Definition
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]

# Nodes
def call_model(state: AgentState):
    messages = state["messages"]
    # Prepend system prompt if not present? 
    # For simplicity, we assume system message is handled or we just invoke.
    # We can prepend system prompt to the messages list for the model call
    if isinstance(messages[0], SystemMessage):
        response = model_with_tools.invoke(messages)
    else:
        response = model_with_tools.invoke([SystemMessage(content=SYSTEM_PROMPT)] + messages)
    return {"messages": [response]}

def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

# Graph Construction
workflow = StateGraph(AgentState)

workflow.add_node("agent", call_model)
if tools:
    tool_node = ToolNode(tools)
    workflow.add_node("tools", tool_node)
    
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", should_continue, ["tools", END])
    workflow.add_edge("tools", "agent")
else:
    workflow.add_edge(START, "agent")
    workflow.add_edge("agent", END)

# Compile
graph = workflow.compile()

def run_agent(user_input):
    inputs = {"messages": [HumanMessage(content=user_input)]}
    # Stream the output
    for s in graph.stream(inputs, stream_mode="values"):
        message = s["messages"][-1]
        message.pretty_print()

if __name__ == "__main__":
    print("Agent Loaded (StateGraph). Type 'exit' to quit.")
    while True:
        user_input = input("User: ")
        if user_input.lower() in ["exit", "quit"]:
            break
        try:
            run_agent(user_input)
        except Exception as e:
            print(f"Error: {e}")
