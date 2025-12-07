import json
import os

def generate_agent_file(config_path='saved_agent_config.json', output_path='agent.py'):
    # Load configuration
    if not os.path.exists(config_path):
        print(f"Error: Config file {config_path} not found.")
        return

    with open(config_path, 'r') as f:
        config = json.load(f)

    # Extract details
    neural_config = config.get('neural_config', {})
    model_id = neural_config.get('model_id', 'gpt-4-turbo')
    system_prompt = neural_config.get('system_prompt', 'You are a helpful AI assistant.')
    
    # Model Setup
    if 'gpt' in model_id:
        model_import = "from langchain_openai import ChatOpenAI"
        model_instantiation = f'model = ChatOpenAI(model="{model_id}")'
    elif 'claude' in model_id:
        model_import = "from langchain_anthropic import ChatAnthropic"
        model_instantiation = f'model = ChatAnthropic(model="{model_id}")'
    else:
        model_import = "from langchain_openai import ChatOpenAI"
        model_instantiation = f'model = ChatOpenAI(model="gpt-3.5-turbo")'

    skills = config.get('skills', [])
    tools_list = []
    imports_list = []
    
    # Skills Setup
    for skill in skills:
        if skill.get('enabled'):
            if skill['id'] == 'web_search':
                tools_list.append("TavilySearchResults(max_results=2)")
                imports_list.append("from langchain_community.tools.tavily_search import TavilySearchResults")
    
    tools_code = f"tools = [{', '.join(tools_list)}]" if tools_list else "tools = []"

    # Generate Agent Code using StateGraph (Class-based)
    agent_code = f'''import os
import operator
from typing import Annotated, TypedDict, Union, List
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
{model_import}
{chr(10).join(set(imports_list))}

# System Prompt
SYSTEM_PROMPT = """{system_prompt}"""

# Model
{model_instantiation}

# Tools
{tools_code}

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
    return {{"messages": [response]}}

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
    inputs = {{"messages": [HumanMessage(content=user_input)]}}
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
            print(f"Error: {{e}}")
'''

    with open(output_path, 'w') as f:
        f.write(agent_code)

    print(f"Agent generated successfully at {output_path}")

if __name__ == "__main__":
    generate_agent_file()
