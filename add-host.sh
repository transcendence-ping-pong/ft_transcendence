#!/bin/bash

IP=$(hostname -I | awk '{print $1}')
DOMAIN="fourpingtwopong.fr"

if ! grep -q "$DOMAIN" /etc/hosts; then
    echo "$IP $DOMAIN" | sudo tee -a /etc/hosts
    echo "Added $DOMAIN to /etc/hosts with IP $IP"
else
    echo "$DOMAIN already exists in /etc/hosts"
fi