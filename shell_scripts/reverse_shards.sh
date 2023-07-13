#!/usr/bin/env bash
#set -e

###
### This script return the shards to the original location
###
### a) Will copy the shards from the links to the mangoTSDB directory.
### b) Will delete the symlinks
### c) Call "RELOAD LINKS (FAST)" api
### d) Will delete the shards in the linked directory
###
### Usage: ./reverse_shards.sh

#ONLY_DELETE="1"

# Function that waits for a user input exits if the input is not Y/y/enter
halt() {

  echo "${1}"

  read -r -p "Continue? [Y(enter)/N]" continue

  if [ -z "$continue" ]; then
    echo "Selection confirmed"

  else
    if [ "$continue" == "Y" ] || [ "$continue" == "y" ]; then
      echo "Selection confirmed"
    else
      exit 1
    fi

  fi
}

# This function looks for the shards directories in the links destination and copy them to the mangoTSDB directory
copy_shards() {

#sudo -u mango cp -rv /ceph/mangoTSDBLinks/783/* /opt/mango4.5-data/databases/mangoTSDB
  if [ "${MOVE_SHARDS}" == "1" ]; then
    SHARD=${1}
    LINKS_DESTINATION=${2}
    cp -rv "${LINKS_DESTINATION}"/"${1}"/* "${DB_PATH}"/mangoTSDB
  fi

}

# This function removes the symlinks
remove_links() {

  if [ "${REMOVE_LINKS}" == "1" ]; then
    SHARD=${1}
    LINKS_DESTINATION=${2}
    #rm -v /opt/mango4.5-data/databases/mangoTSDB/links/783
    rm -v "${DB_PATH}"/"${DB_LINKS}"/"${SHARD}"

  fi

}

#This function deletes the old shards in the mangoTSDB directory
delete_shard_on_link() {
  if [ "${DELETE}" == "1" ]; then

    if [ "${MOVE_SHARDS}" == "1" ]; then
        SHARD=${1}
        LINKS_DESTINATION=${2}
        rm -rv "${LINKS_DESTINATION}"/"${SHARD}"
    fi

  fi
}

#This function prepares an calls the Mango AIP to reload links.
nosql_reload_links() {
  MANGO_URL="${1}"
  TOKEN="${2}"
  FAST="${3}"
  TIMEOUT="${4}"
  if [ "$FAST" == "true" ] || [ "$FAST" == true ]; then
    echo "RELOAD LINKS (FAST)"
  else
    if [ "${FAST}" == "false" ]; then
      echo "RELOAD LINKS AND SHUFFLE SHARDS"
      FAST="false"
    else
      echo "Invalid parameter. Will use default RELOAD LINKS (FAST)"
      FAST="true"
    fi
  fi

  if [ -z "$TIMEOUT" ]; then
    payload="{\"fastLoad\":${FAST}}"
  else
    echo "Timeout set to: $TIMEOUT"
    payload="{\"fastLoad\":${FAST}, \"timeout\":${TIMEOUT}}"

  fi
  echo "payload: $payload"


  RESULT=$(curl --location --request PUT "${MANGO_URL}/rest/latest/actions/trigger/noSqlReloadLinks" \
    --header 'Accept: application/json, text/plain, */*' \
    --header 'Accept-Language: en-US,en;q=0.9' \
    --header 'Connection: keep-alive' \
    --header 'Content-Type: application/json;charset=UTF-8' \
    --header 'DNT: 1' \
    --header 'Origin: http://localhost:8080' \
    --header 'Referer: http://localhost:8080/ui/administration/system/no-sql' \
    --header 'Sec-Fetch-Dest: empty' \
    --header 'Sec-Fetch-Mode: cors' \
    --header 'Sec-Fetch-Site: same-origin' \
    --header 'X-Requested-With: XMLHttpRequest' \
    --header 'sec-ch-ua-mobile: ?0' \
    --header "Authorization: Bearer ${TOKEN}" \
    --data "${payload}")
  echo "$RESULT"

}

#This function sends a simple get to validate the token. This don't affect the shards.
validate_aut_token() {
  echo "Validating Token"
  MANGO_URL="${1}"
  TOKEN="${2}"
  RESULT=$(curl --location "${MANGO_URL}/rest/latest/roles/user" \
    --header 'Accept: application/json, text/plain, */*' \
    --header 'Accept-Language: en-US,en;q=0.9' \
    --header 'Connection: keep-alive' \
    --header 'Content-Type: application/json;charset=UTF-8' \
    --header 'DNT: 1' \
    --header 'Origin: http://localhost:8080' \
    --header 'Referer: http://localhost:8080/ui/administration/system/no-sql' \
    --header 'Sec-Fetch-Dest: empty' \
    --header 'Sec-Fetch-Mode: cors' \
    --header 'Sec-Fetch-Site: same-origin' \
    --header 'X-Requested-With: XMLHttpRequest' \
    --header 'sec-ch-ua-mobile: ?0' \
    --header "Authorization: Bearer ${TOKEN}")
  echo "$RESULT"

  SUB='xid'
  if [[ "$RESULT" == *"$SUB"* ]]; then
    echo "Token Validated..."
  else
    echo "Token INVALID!!!"
    exit 1
  fi

}
#Show the user running the script
halt "Running script as user $(whoami)"

## The parameter 1 defines the fast load, for now the default and recommended value is true that will execute
## the RELOAD SHARDS (FAST)
if [ -z "$1" ]; then
  FAST_LOAD="true"
else
  FAST_LOAD=$1
fi

##Display different prompts depending on the fast load parameter
if [ "$FAST_LOAD" == "false" ] || [ "$FAST_LOAD" == false ]; then
  ## when fast load is false the script will only create the symlinks and call "RELOAD LINKS AND SHUFFLE SHARDS" api

  if [ -z "$MOVE_SHARDS" ]; then
    halt "This script will not copy the shards to the links destination path, Mango will do it."
    MOVE_SHARDS="0"
  fi

  if [ -z "$REMOVE_LINKS" ]; then
    halt "This script will create the links and reload shards"
    REMOVE_LINKS="1"
  fi

  if [ -z "$DELETE" ]; then
    halt "This script will not delete the original shards, Mango will do it."
    DELETE="0"
  fi
else

  ## When fast load is true the script:
  ## a) Will copy the shards to the links destination
  ## b) Will create the symlinks
  ## c) Call "RELOAD LINKS (FAST)" api
  ## d) Will delete the old shards
  if [ -z "$MOVE_SHARDS" ]; then
    halt "This script will copy the shards from the links destination path to the mangoTSDB directory"
    MOVE_SHARDS="1"
  fi

  if [ -z "$REMOVE_LINKS" ]; then
    halt "This script will remove the links and reload shards"
    REMOVE_LINKS="1"
  fi

  if [ -z "$DELETE" ]; then
    halt "This script will delete the shards from the links destination"
    DELETE="1"
  fi

fi

#If the variable DB_PATH is not defined the user will be asked for it
if [ -z "$DB_PATH" ]; then
  echo "Please enter the databases path path i.e. \"/opt/mango4.5-data/databases\""
  read -r DB_PATH
fi
#validate the $DB_PATH
cd "$DB_PATH"
echo "$DB_PATH is valid"

#If the variable $LINKS_PATH is not defined the user will be asked for it
if [ -z "$LINKS_PATH" ]; then
  echo "Please enter the links destination path i.e. \"/ceph/mangoTSDBLinks\""
  read -r LINKS_PATH
fi
#validate the $LINKS_PATH
cd "$LINKS_PATH"
echo "$LINKS_PATH is valid"

#If the variable $M_URL is not defined the user will be asked for it
if [ -z "$M_URL" ] && [ "$MOVE_SHARDS" == 1 ]; then
  echo "Please enter the Mango URL"
  read -r M_URL
fi
echo "$M_URL"

#If the variable $AUTH_TOKEN is not defined the user will be asked for it
# A valid AUTHENTICATION TOKEN is required to call mango APIs
if [ -z "$AUTH_TOKEN" ] && [ "$MOVE_SHARDS" == 1 ]; then
  echo "Please enter a valid Mango Authentication Token"
  read -r AUTH_TOKEN
  # verify the token is valid
  validate_aut_token "$M_URL" "$AUTH_TOKEN"
fi

#go to the databases path in mango
cd "$DB_PATH"

echo "Finding shards...  (this may take several minutes)"

#Get the shards list.
cd "$LINKS_PATH"
SHARDS_LIST=$(ls)
shardsListForArray=$(tr '\n' ' ' <<<"$SHARDS_LIST")
IFS=" " read -r -a SHARDS_ARRAY <<< "$shardsListForArray"


SHARD_COUNT="${#SHARDS_ARRAY[@]}"


#Find the current shard that will be excluded from the process
  #allShards="${SHARDS_ARRAY[*]}"
  #indexOfCurrent=$SHARD_COUNT-1
  #CURRENT_SHARD="${SHARDS_ARRAY[$indexOfCurrent]}"
  #echo "Current shard to be excluded: $CURRENT_SHARD"
  #unset 'SHARDS_ARRAY[$indexOfCurrent]'
## uncomment lines above to exclude current shard



#echo "${#SHARDS_ARRAY[@]}"
#echo "${#allShards[@]}"

#Count the number of shards available to move.
SHARD_COUNT="${#SHARDS_ARRAY[@]}"

shardsToMove=-1

####Get the list of shards to move
echo "There are ${SHARD_COUNT} shards to be moved:{ ${SHARDS_ARRAY[*]} } Which shards do you want to move? (i.e: 770 771 777)"
read -r SHARDS_LISTED
IFS=" " read -r -a shardListToMove <<< "$SHARDS_LISTED"

halt "The following shards are going to be moved:{ ${shardListToMove[*]} }"

DB_LINKS='mangoTSDB/links'

# Copy each shard to their destination and remove the symlinks

for item in "${shardListToMove[@]}"; do
  if [ "${MOVE_SHARDS}" == "1" ]; then
    echo "$item"
    echo "Coping shard files..."
    copy_shards "$item" "$LINKS_PATH"
  fi
  echo "deleting link..."
  remove_links "$item" "$LINKS_PATH"
  #read pausing
done



#Send the reload links request
if [ "${REMOVE_LINKS}" == "1" ]; then
  #halt "Send RELOAD LINKS (FAST) api call?"

  echo "$FAST_LOAD"
  ##
  ## The parameter 2 sets an optional timeout for the request.
  ##
  TIMEOUT=$2
  echo "Reloading links"
  nosql_reload_links "$M_URL" "$AUTH_TOKEN" "$FAST_LOAD" "$TIMEOUT"
  echo "Reload Links request sent"
fi

##

if [ "${DELETE}" == "1" ]; then

  for item in "${shardListToMove[@]}"; do
    delete_shard_on_link "$item" "$LINKS_PATH"
  done

fi



# Done!
echo "Finished"
