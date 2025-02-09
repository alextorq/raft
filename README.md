# Try to select leader tab in browser

State machine based approach 
Every tab self election leader by sort array of active tabs

Every tab get node-id on create. 
Node-id it is uuid 4 
After start election every tab sort all node-id of active tabs
and choose leader.

Sort function in modern browsers are stable if you use old browsers you can implement it by you self 

![img.png](img.png)![img_1.png](img_1.png)