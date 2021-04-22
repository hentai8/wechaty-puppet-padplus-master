/* eslint-disable */
import {
  PadplusMessagePayload,
  RoomTopicEvent,
  RoomRelatedXmlSchema,
}                         from '../schemas'

import {
  isPayload,
  isRoomId,
}               from './is-type'
import { YOU } from 'wechaty-puppet'
import { xmlToJson } from './xml-to-json'
import { getUserName, getNickName } from './get-xml-label'

/**
 *
 * 3. Room Topic Event
 *
 */
const ROOM_TOPIC_OTHER_REGEX_LIST = [
  /^"(.+)" changed the group name to "(.+)"$/,
  /^"(.+)"修改群名为“(.+)”$/,
]

const ROOM_TOPIC_YOU_REGEX_LIST = [
  /^(You) changed the group name to "(.+)"$/,
  /^(你)修改群名为“(.+)”$/,
]

export async function roomTopicEventMessageParser (
  rawPayload: PadplusMessagePayload,
): Promise<null | RoomTopicEvent> {
  if (!isPayload(rawPayload)) {
    return null
  }

  const roomId  = rawPayload.fromUserName
  const timestamp = rawPayload.createTime
  if (!roomId) {
    return null
  }
  if (!isRoomId(roomId)) {
    return null
  }

  let content = rawPayload.content
  let needParseXML = content.includes('你修改群名为') || content.includes('You changed the group name to')
  let linkList

  if (!needParseXML) {
    const tryXmlText = content.replace(/^[^\n]+\n/, '')
    const jsonPayload: RoomRelatedXmlSchema = await xmlToJson(tryXmlText) // toJson(tryXmlText, { object: true }) as RoomRelatedXmlSchema
    if (!jsonPayload || !jsonPayload.sysmsg || jsonPayload.sysmsg.$.type !== 'sysmsgtemplate') {
      return null
    }
    content = jsonPayload.sysmsg.sysmsgtemplate.content_template.template
    linkList = jsonPayload.sysmsg.sysmsgtemplate.content_template.link_list.link
  }

  let matchesForOther:  null | string[] = []
  let matchesForYou:    null | string[] = []

  ROOM_TOPIC_OTHER_REGEX_LIST.some(regex => !!(matchesForOther = content.match(regex)))
  ROOM_TOPIC_YOU_REGEX_LIST.some(regex => !!(matchesForYou   = content.match(regex)))

  const matches: Array<string | YOU> = matchesForOther || matchesForYou
  if (!matches) {
    return null
  }

  let changerId = matches[1]
  let topic = matches[2] as string

  if ((matchesForYou && changerId === '你') || changerId === 'You') {
    changerId = YOU
  } else {
    changerId = getUserName(linkList, changerId as string)
    topic = getNickName(linkList, topic)
  }

  const roomTopicEvent: RoomTopicEvent = {
    changerId,
    roomId,
    timestamp,
    topic,
  }

  return roomTopicEvent
}
