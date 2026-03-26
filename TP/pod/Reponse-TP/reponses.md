# ynov-pod 

## exercice 2

### 1 
    kubectl apply -f pod-ynov-sidecar.yaml

### 2 
    kubectl get pod ynov-pod --watch on espère voir running

### 3 
    kubectl describe pod ynov-pod

    Name:             ynov-pod
    Namespace:        default
    Priority:         0
    Service Account:  default
    Node:             kind-worker2/172.26.0.4
    Start Time:       Thu, 26 Mar 2026 11:52:18 +0100
    Labels:           <none>
    Annotations:      <none>
    Status:           Running
    IP:               10.244.2.3
    IPs:
    IP:  10.244.2.3
    Containers:
    writer:
        Container ID:  containerd://dfec545abcad5b2c7ebf7635b12ccf25b29b3e73ac94d1b9006db0db449c039c
        Image:         busybox
        Image ID:      docker.io/library/busybox@sha256:1487d0af5f52b4ba31c7e465126ee2123fe3f2305d638e7827681e7cf6c83d5e
        Port:          <none>
        Host Port:     <none>
        Command:
        sh
        -c
        while true; do
            echo "<html><body><h1>$(date)</h1><p>Je suis à Ynov Croix</p></body></html>" > /data/index.html
            echo "index.html mis à jour à $(date)"
            sleep 3
        done
        
        State:          Running
        Started:      Thu, 26 Mar 2026 11:52:22 +0100
        Ready:          True
        Restart Count:  0
        Environment:    <none>
        Mounts:
        /data from web-content (rw)
        /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-w2wkh (ro)
    nginx:
        Container ID:   containerd://744974d35ac143352a03687f1f195312e8a3a77a2efcda3743604275da9d1550
        Image:          nginx:1.25
        Image ID:       docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c
        Port:           80/TCP
        Host Port:      0/TCP
        State:          Running
        Started:      Thu, 26 Mar 2026 11:52:29 +0100
        Ready:          True
        Restart Count:  0
        Environment:    <none>
        Mounts:
        /usr/share/nginx/html from web-content (rw)
        /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-w2wkh (ro)
    Conditions:
    Type                        Status
    PodReadyToStartContainers   True 
    Initialized                 True 
    Ready                       True 
    ContainersReady             True 
    PodScheduled                True 
    Volumes:
    web-content:
        Type:       EmptyDir (a temporary directory that shares a pod's lifetime)
        Medium:     
        SizeLimit:  <unset>
    kube-api-access-w2wkh:
        Type:                    Projected (a volume that contains injected data from multiple sources)
        TokenExpirationSeconds:  3607
        ConfigMapName:           kube-root-ca.crt
        Optional:                false
        DownwardAPI:             true
    QoS Class:                   BestEffort
    Node-Selectors:              <none>
    Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                                node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
    Events:
    Type    Reason     Age    From               Message
    ----    ------     ----   ----               -------
    Normal  Scheduled  3m10s  default-scheduler  Successfully assigned default/ynov-pod to kind-worker2
    Normal  Pulling    3m9s   kubelet            Pulling image "busybox"
    Normal  Pulled     3m6s   kubelet            Successfully pulled image "busybox" in 2.928s (2.928s including waiting). Image size: 1911327 bytes.
    Normal  Created    3m6s   kubelet            Container created
    Normal  Started    3m6s   kubelet            Container started
    Normal  Pulling    3m6s   kubelet            Pulling image "nginx:1.25"
    Normal  Pulled     3m     kubelet            Successfully pulled image "nginx:1.25" in 6.619s (6.619s including waiting). Image size: 67665983 bytes.
    Normal  Created    3m     kubelet            Container created
    Normal  Started    2m59s  kubelet            Container started

## Exercice 3

### 1 
    kubectl port-forward pod/ynov-pod 8080:80

### 2 
    Que voyez-vous s'afficher ?
    -> la date et la phrase je suis à ynov croix
    La page se met-elle à jour automatiquement ? À quelle fréquence ?
    -> non, mais si on raffraichit le navigateur elle se met à jour, le pod est réécrit toutes les 3 secondes.

## Exercice 4

### 2

    Que se passe-t-il dans les logs nginx quand vous rafraîchissez la page ?
    -> à chaque rafraîchissement, nginx ajoute une ligne de log HTTP, typiquement une requête GET / avec le code de réponse, souvent 200.
    Quelle option de kubectl logs permet de spécifier un conteneur dans un Pod multi-conteneurs ?
    -> option -c

## Exercice 5

### 1 
    kubectl exec ynov-pod -c writer -- cat /data/index.html

### 2 
    kubectl exec ynov-pod -c nginx -- cat /usr/share/nginx/html/index.html

    Les deux commandes affichent-elles le même contenu ? Expliquez pourquoi.
    -> oui car ils partagent le même volume emptyDir, writer écrit dans le volume et nginx le lit.

## Exercice 6

### 1 
    Les deux adresses IP sont-elles identiques ?
    -> oui
    Que cela implique-t-il ?
    -> Les deux conteneurs partagent le réseau du Pod. Donc ils peuvent communiquer entre eux via localhost ou l'ip du pod

### 2 
    kubectl exec ynov-pod -c writer -- wget -qO- http://localhost
    -> fonctionne

## Exercice 7

### 1
    kubectl exec ynov-pod -c writer -- sh -c 'echo "<html><body><h1>MODIFICATION MANUELLE</h1><p>Hello Ynov</p></body></html>" > /data/index.html'

### 2 
    Que voyez-vous immédiatement après la modification ?
    -> La nouvelle page avec MODIFICATION MANUELLE et Hello Ynov.
    Que se passe-t-il 3 secondes plus tard ? Pourquoi ?
    -> Le contenu est écrasé par le script du conteneur writer, qui tourne en boucle et réécrit index.html toutes les 3 secondes.

## Exercice 8

### 1 
    modification du manifeste : 
    - name: writer
      image: busybox
      command:
        - sh
        - -c
        - |
          echo "writer crash volontaire"
          exit 1
      volumeMounts:
        - name: web-content
          mountPath: /data

### 2 
    kubectl get pod ynov-pod -w
    NAME       READY   STATUS             RESTARTS      AGE
    ynov-pod   1/2     CrashLoopBackOff   1 (11s ago)   13s
    ynov-pod   1/2     Error              2 (15s ago)   17s

    Quel conteneur a redémarré ?
    -> seulement le writer
    Le conteneur nginx a-t-il été affecté ?
    -> non
    La page est-elle toujours accessible pendant le redémarrage du writer ?
    -> ui, en principe oui, tant que nginx continue de fonctionner. Il peut servir le dernier fichier index.html déjà présent dans le volume partagé. En revanche, pendant que writer est arrêté, le contenu n’est plus mis à jour toutes les 3 secondes.

## Exercice 9

### 1 
    kubectl delete pod ynov-pod

    Que devient le contenu du volume emptyDir après la suppression du Pod ?
    -> le contenu est supprimé