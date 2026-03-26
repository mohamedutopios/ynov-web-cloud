# TP — Pod multi-conteneurs : Sidecar Writer + Nginx

## Contexte

Vous allez déployer un Pod Kubernetes contenant **deux conteneurs** qui
collaborent via un volume partagé :

- Un conteneur **busybox** qui écrit toutes les 3 secondes la date et le
  message *"Je suis à Ynov Croix"* dans un fichier `index.html`
- Un conteneur **nginx** qui sert ce fichier sur le port 80

L'objectif est de comprendre comment deux conteneurs d'un même Pod
**partagent le réseau et le stockage**, et d'observer ce mécanisme en direct
depuis votre navigateur.

---

## Architecture cible

```
┌──────────────────────────────────────────────────────┐
│                    Pod "ynov-pod"                    │
│                                                      │
│  ┌─────────────────┐      ┌─────────────────────┐   │
│  │    busybox      │      │       nginx         │   │
│  │   (writer)      │      │   (serveur web)     │   │
│  │                 │      │                     │   │
│  │  toutes les 3s  │      │  sert index.html    │   │
│  │  → écrit date + │      │  sur le port 80     │   │
│  │  message dans   │      │                     │   │
│  │  index.html     │      │                     │   │
│  └────────┬────────┘      └──────────┬──────────┘   │
│           │ écrit                    │ lit           │
│           ▼                          ▼               │
│  ┌──────────────────────────────────────────────┐    │
│  │        Volume emptyDir  "web-content"        │    │
│  │                                              │    │
│  │  busybox → /data/index.html                  │    │
│  │  nginx   → /usr/share/nginx/html/index.html  │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
                    │
          port-forward 8080:80
                    │
               [Navigateur]
           http://localhost:8080
```

---

## Prérequis

- Cluster kind opérationnel (`kind get clusters`)
- `kubectl` configuré et fonctionnel (`kubectl get nodes`)

---

## Exercice 1 — Créer le manifest du Pod

Créez un fichier `pod-ynov-sidecar.yaml` contenant un Pod nommé `ynov-pod`
avec les caractéristiques suivantes :

### Le volume

Déclarez un volume de type `emptyDir` nommé `web-content` au niveau du Pod.

> 💡 Un volume `emptyDir` est créé vide au démarrage du Pod et partagé entre
> tous ses conteneurs. Il est détruit quand le Pod est supprimé.

### Conteneur 1 — `writer` (busybox)

| Propriété | Valeur |
|---|---|
| Nom | `writer` |
| Image | `busybox` |
| Volume monté | `web-content` → `/data` |

La commande du conteneur doit :
- Tourner en boucle infinie
- Toutes les 3 secondes, écrire dans `/data/index.html` :
  - La date et l'heure courantes (commande `date`)
  - Le message **"Je suis à Ynov Croix"**
- Afficher un message dans les logs à chaque écriture

### Conteneur 2 — `nginx` (nginx:1.25)

| Propriété | Valeur |
|---|---|
| Nom | `nginx` |
| Image | `nginx:1.25` |
| Port | `80` |
| Volume monté | `web-content` → `/usr/share/nginx/html` |

> 💡 `/usr/share/nginx/html` est le répertoire par défaut servi par Nginx.
> En montant le volume à cet endroit, Nginx sert automatiquement l'`index.html`
> écrit par le conteneur `writer`.

---

## Exercice 2 — Déployer et vérifier

**2.1** Appliquez le manifest :
```bash
kubectl apply -f pod-ynov-sidecar.yaml
```

**2.2** Surveillez le démarrage du Pod. Quelle valeur doit afficher la colonne
`READY` pour que le Pod soit pleinement opérationnel ?

```bash
kubectl get pod ynov-pod --watch
```

**2.3** Décrivez le Pod et repérez dans la sortie :
- Les deux conteneurs et leurs images
- Le volume `web-content` et ses deux points de montage
- La section `Events`

```bash
kubectl describe pod ynov-pod
```

---

## Exercice 3 — Accéder à l'application

**3.1** Ouvrez un port-forward vers le Pod :

```bash
kubectl port-forward pod/ynov-pod 8080:80
```

**3.2** Ouvrez votre navigateur à l'adresse **http://localhost:8080**

**Questions :**
- Que voyez-vous s'afficher ?
- La page se met-elle à jour automatiquement ? À quelle fréquence ?
- Laissez le port-forward actif et ouvrez un **nouveau terminal** pour la suite.

---

## Exercice 4 — Observer les logs

**4.1** Affichez les logs du conteneur `writer` en temps réel :

```bash
kubectl logs ynov-pod -c writer --follow
```

**4.2** Dans un autre terminal, affichez les logs du conteneur `nginx` :

```bash
kubectl logs ynov-pod -c nginx --follow
```

**Questions :**
- Que se passe-t-il dans les logs nginx quand vous rafraîchissez la page ?
- Quelle option de `kubectl logs` permet de spécifier un conteneur dans un
  Pod multi-conteneurs ?

---

## Exercice 5 — Explorer le volume partagé

**5.1** Lisez le fichier `index.html` depuis le conteneur `writer` :

```bash
kubectl exec ynov-pod -c writer -- cat /data/index.html
```

**5.2** Lisez le même fichier depuis le conteneur `nginx` :

```bash
kubectl exec ynov-pod -c nginx -- cat /usr/share/nginx/html/index.html
```

**Question :** Les deux commandes affichent-elles le même contenu ?
Expliquez pourquoi.

---

## Exercice 6 — Vérifier le réseau partagé

**6.1** Récupérez l'adresse IP de chaque conteneur :

```bash
kubectl exec ynov-pod -c writer -- hostname -i
kubectl exec ynov-pod -c nginx  -- hostname -i
```

**Question :** Les deux adresses IP sont-elles identiques ? Que cela
implique-t-il pour la communication entre les conteneurs ?

**6.2** Vérifiez que le conteneur `writer` peut accéder à nginx via
`localhost` :

```bash
kubectl exec ynov-pod -c writer -- wget -qO- http://localhost:80 | head -5
```

---

## Exercice 7 — Modification à chaud

**7.1** Écrivez manuellement un nouveau contenu dans le volume depuis le
conteneur `writer` :

```bash
kubectl exec ynov-pod -c writer -- sh -c \
  'echo "<h1>Contenu modifié manuellement !</h1>" > /data/index.html'
```

**7.2** Rafraîchissez votre navigateur.

**Questions :**
- Que voyez-vous immédiatement après la modification ?
- Que se passe-t-il 3 secondes plus tard ? Pourquoi ?

---

## Exercice 8 — Résilience du Pod

**8.1** Simulez un crash du conteneur `writer` :

```bash
kubectl exec ynov-pod -c writer -- kill 1
```

**8.2** Observez l'état du Pod :

```bash
kubectl get pod ynov-pod --watch
```

**Questions :**
- Quel conteneur a redémarré ?
- Le conteneur `nginx` a-t-il été affecté ?
- La page est-elle toujours accessible pendant le redémarrage du `writer` ?

---

## Exercice 9 — Nettoyage

```bash
kubectl delete pod ynov-pod
```

**Question :** Que devient le contenu du volume `emptyDir` après la
suppression du Pod ?

---

## Questions de synthèse

1. Quelle est la différence entre un volume `emptyDir` et un
   `PersistentVolumeClaim` ?

2. Dans quel cas place-t-on deux conteneurs dans le même Pod plutôt que dans
   deux Pods séparés ?

3. Citez deux patterns courants de Pod multi-conteneurs et décrivez leur rôle.

4. Si on voulait que les données de `index.html` survivent à la suppression
   du Pod, quelle modification faudrait-il apporter au manifest ?

---

## Rappel des commandes utiles

```bash
# Appliquer un manifest
kubectl apply -f <fichier.yaml>

# Surveiller un Pod
kubectl get pod <nom> --watch

# Décrire un Pod
kubectl describe pod <nom>

# Logs d'un conteneur spécifique
kubectl logs <pod> -c <conteneur> --follow

# Exécuter une commande dans un conteneur
kubectl exec <pod> -c <conteneur> -- <commande>

# Port-forward
kubectl port-forward pod/<nom> <port-local>:<port-pod>

# Supprimer un Pod
kubectl delete pod <nom>
```
