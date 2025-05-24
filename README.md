# Try to select leader tab in browser

State machine based approach 
Every tab self election leader by sort array of active tabs

Every tab get node-id on create. 
Node-id it is uuid 4 
After start election every tab sort all node-id of active tabs
and choose leader.

Sort function in modern browsers are stable if you use old browsers you can implement it by you self 

![img.png](img.png)

## Raft Implementation Details

This project implements a simplified leader election mechanism inspired by the Raft consensus algorithm. Raft is designed to manage a replicated log and ensure that distributed systems can reach consensus on the state of data, even in the face of failures. A key part of Raft is electing a leader, which is responsible for coordinating the other nodes.

In this implementation (`src/raft/RaftNode.ts`):
- Nodes can be in one of three states: Follower, Candidate, or Leader.
- Nodes start as Followers.
- If a Follower does not hear from a Leader within a certain time (election timeout), it transitions to a Candidate and starts an election.
- Candidates request votes from other nodes (implicitly in this simplified version, by broadcasting their candidacy).
- If a Candidate receives support from a majority of nodes (in this case, by becoming the first in a sorted list of active node IDs), it becomes the Leader.
- The Leader is responsible for sending out heartbeats to other nodes to maintain its authority and prevent new elections.

**Disclaimer:** This is not a complete or "pure" implementation of the Raft consensus algorithm. It focuses primarily on the leader election aspect in a browser tab environment and may omit or simplify other features of Raft, such as log replication or membership changes, for the specific use case of this project.
