port result : 5000 -> ClusterIP
port vote : 5000 -> ClusterIP
redis : 6379 -> ClusterIP
POSTGRES : 5432 -> ClusterIP
result-ui : 80 -> NodePort
vote-ui : 80 -> NodePort
