```bash
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_DB=bookshelf \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=postgres
```

Vérifier :
```bash
# Le Secret existe ?
kubectl get secret postgres-secret

# Voir les clés (valeurs encodées en base64)
kubectl get secret postgres-secret -o yaml

# Décoder une valeur
kubectl get secret postgres-secret \
  -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d
# → postgres
```