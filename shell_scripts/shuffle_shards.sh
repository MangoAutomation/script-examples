#!/usr/bin/env bash
#set -e

###
### This script shuffles shards to a different location automatically
###
### a) Will copy the shards to the links destination
### b) Will create the symlinks
### c) Call "RELOAD LINKS (FAST)" api
### d) Will delete the old shards
###
### Usage: ./shuffle_shards.sh
###
###

#ONLY_DELETE="1"

# Funtion that waits for a user input exits if the input is not Y/y/enter
halt() {
  echo ""
  echo "${1}"
  echo "Continue? [Y(enter)/N]"
  read -r -p "" continue

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
stopAndReloadSlowManually=false

#check_for_existing_links
check_for_existing_links() {
  echo "check for existing links"
  LINK="${DB_PATH}"/"${DB_LINKS}"/"${1}"
  echo "check for existing link $LINK"
  if [ -d "$LINK" ]; then
    echo "$LINK found"
    if [ -L "$LINK" ]; then
      # It is a symbolic links
      echo "Symbolic link $LINK found "
      #chack for destination directory
      check_for_existing_shard_destinations "${1}" "$LINKS_PATH" "$LINK"

    else
      # It is a directory #

      if [ "$(ls -A "$LINK")" ]; then

        #directory not empty
        stopAndReloadSlowManually=true
        echo "Take action $LINK is not Empty. And it is NOT a simlync. "
        echo "Is recommended to stop the process and review the $DB_PATH/$DB_LINKS directory because this should be a link"
        echo "Options: "
        echo "Based on the contents, evaluate the possibility of manually moving $LINK directory to the $LINKS_PATH destination.   "
        echo "Then delete $LINK directory"
        echo "Then create the Link $LINK -> $LINKS_PATH/$1 directory"
        echo "Finally run RELOAD LINKS (FAST) in the UI"

      else
        #delete empty directory it will be created later.
        echo "$LINK is Empty  "
        rm -d "$LINK"
      fi

    fi
  fi

}

#check_for_existing_shard_destinations
check_for_existing_shard_destinations() {
  DIR="${2}"/"${1}"
  echo "check for existing dir $DIR"

  if [ -d "$DIR" ]
  then
  	if [ "$(ls -A "$DIR")" ]; then

       stopAndReloadSlowManually=true
       echo "Take action $DIR is not Empty. There might be shards already linked."
       echo "Is recommended to stop the process and review the link destinations because there are links already created that are not empty"
       echo "Options: "
       echo "1. If there are split shards, by running RELOAD LINKS AND SHUFFLE SHARDS this could be fixed."
       echo "-OR-"
       echo "2. Delete the $DIR directory, its contents. Delete the link ${3} if exits "
       echo ""

  	else
  	  #delete empty directory it will be created later.
      echo "$DIR is Empty "
      rm -d "$DIR"
  	fi
  else
  	echo "Directory $DIR not found."
  fi

}

# This function looks for the shards and copy them over to the links destination
copy_shards() {

  find . -type f \( -name "${1}.data.rev" \) | while read -r DATA_FILE; do
    SEGMENT=$(echo "${DATA_FILE}" | awk -F'/' '{print $3}')
    SERIES=$(echo "${DATA_FILE}" | awk -F'/' '{print $4}')
    SHARD_FILE=$(echo "${DATA_FILE}" | awk -F'/' '{print $5}')
    SHARD=$(echo "${SHARD_FILE}" | sed 's/.data.rev//g')
    LINKS_DESTINATION=${2}

    if [ "${MOVE_SHARDS}" == "1" ]; then
      mkdir -pv "${LINKS_DESTINATION}"/"${SHARD}"/"${SEGMENT}"/"${SERIES}"

      cp -uv mangoTSDB/"${SEGMENT}"/"${SERIES}"/"${SHARD_FILE}" "${LINKS_DESTINATION}"/"${SHARD}"/"${SEGMENT}"/"${SERIES}"/"${SHARD_FILE}"

    fi
  done

}

# This function creates the symlinks
create_links() {

  if [ "${CREATE_LINKS}" == "1" ]; then
    SHARD=${1}
    LINKS_DESTINATION=${2}
    LINK="${DB_PATH}"/"${DB_LINKS}"/"${1}"

    if [ -d "${LINKS_DESTINATION}"/"${SHARD}" ]; then
      if [ ! -L "$LINK" ]; then
       ln -nsfv "${LINKS_DESTINATION}"/"${SHARD}" "${DB_PATH}"/"${DB_LINKS}"
       else
        echo "$LINK already exits"
      fi
    fi
  fi

}

#This function deletes the old shards in the mangoTSDB directory
delete_shard() {
  if [ "${DELETE}" == "1" ]; then

    find . -type f \( -name "${1}.data.rev" \) | while read -r DATA_FILE; do
      SEGMENT=$(echo "${DATA_FILE}" | awk -F'/' '{print $3}')
      SERIES=$(echo "${DATA_FILE}" | awk -F'/' '{print $4}')
      SHARD_FILE=$(echo "${DATA_FILE}" | awk -F'/' '{print $5}')

      rm -v mangoTSDB/"${SEGMENT}"/"${SERIES}"/"${SHARD_FILE}"

    done
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

  if [ -z "$CREATE_LINKS" ]; then
    halt "This script will create the links and reload shards"
    CREATE_LINKS="1"
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
    halt "This script will copy the shards to the links destination path"
    MOVE_SHARDS="1"
  fi

  if [ -z "$CREATE_LINKS" ]; then
    halt "This script will create the links and reload shards"
    CREATE_LINKS="1"
  fi

  if [ -z "$DELETE" ]; then
    halt "This script will delete the original shards"
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
SHARDS_LIST=$(find . -type f -name "*.data.rev" -printf '%f\n' | sort | grep -v filter | uniq | sed -e 's/\.data.rev$//')
shardsListForArray=$(tr '\n' ' ' <<<"$SHARDS_LIST")
IFS=" " read -r -a SHARDS_ARRAY <<< "$shardsListForArray"


SHARD_COUNT="${#SHARDS_ARRAY[@]}"


#Find the current shard that will be excluded from the process
  allShards="${SHARDS_ARRAY[*]}"
  indexOfCurrent=$SHARD_COUNT-1
  CURRENT_SHARD="${SHARDS_ARRAY[$indexOfCurrent]}"
  echo "Current shard to be excluded: $CURRENT_SHARD"
  unset 'SHARDS_ARRAY[$indexOfCurrent]'
## uncomment lines above to exclude current shard



#echo "${#SHARDS_ARRAY[@]}"
#echo "${#allShards[@]}"

#Count the number of shards available to move.
SHARD_COUNT="${#SHARDS_ARRAY[@]}"

shardsToMove=-1

# ASk the user for the number of shards to move by the script
echo "There are ${SHARD_COUNT} shards to be moved:{ ${SHARDS_ARRAY[*]} } Which shards do you want to move? (i.e: 770 771 777)"

read -r SHARDS_LISTED
IFS=" " read -r -a shardListToMove <<< "$SHARDS_LISTED"

validate_item() {
  found=false
  for availableShard in "${SHARDS_ARRAY[@]}"
  do
    if [ "$availableShard" == "${1}" ]
    then
      found=true
      echo "Found $availableShard!"
      break
    fi

 done
 if [ "$found" == false ]; then
  unset 'shardListToMove[${2}]'
 fi

}
index=0
for item in "${shardListToMove[@]}"; do

  validate_item "$item" "$index"
  index=$index+1

done
echo "Elements to move ${#shardListToMove[@]}"
if [ ! ${#shardListToMove[@]} -gt 0 ]; then
  echo "Invalid list! there are no shards to be moved in the provided list"
  exit 1
fi

halt "The following shards are going to be moved:{ ${shardListToMove[*]} }"

# Create the links directory
DB_LINKS='mangoTSDB/links'

cd "$DB_PATH"
if [ "${CREATE_LINKS}" == "1" ]; then
  mkdir -p -v "$DB_PATH"/$DB_LINKS
fi

#perform checks
for item in "${shardListToMove[@]}"; do
  check_for_existing_links "$item" "$LINKS_PATH"
  check_for_existing_shard_destinations "$item" "$LINKS_PATH"
done

if [ "$stopAndReloadSlowManually" = true ] ; then
  exit 1
fi




# Copy each shard to their destination and create the symlinks
#for item in "${SHARDS_ARRAY[@]}"; do
for item in "${shardListToMove[@]}"; do

  validate_item "$item"

  if [ "${MOVE_SHARDS}" == "1" ]; then
    echo "$item"
    echo "Coping shard files..."
    copy_shards "$item" "$LINKS_PATH"
  fi
  echo "Creating link..."
  create_links "$item" "$LINKS_PATH"
  #read pausing
done

echo "Links creation finished!"

#Send the reload links request
if [ "${CREATE_LINKS}" == "1" ]; then
  echo ""
  echo "Sending RELOAD LINKS (FAST) api call"
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
# Remind the user to restart mango before deleting the shards. (this step could be skipped in the future if the
# bugs regarding the reload links have been resolved)
if [ "${DELETE}" == "1" ]; then
  echo ""
  echo "*******************"
  echo "****IMPORTANT*****"
  echo "*******************"
  halt "Please wait for the log \" Finished TSDB link reload \" in the ma.log "

  halt "The following shards are going to be deleted from the original path:{ ${shardListToMove[*]} }"
  # Delete the old shards.
  for item in "${shardListToMove[@]}"; do
    delete_shard "$item"
  done

fi



# Done!
echo "Finished"
