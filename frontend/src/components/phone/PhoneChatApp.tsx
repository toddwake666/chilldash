import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import Animated, { FadeIn, FadeInRight, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/src/theme';
import { useGame } from '@/src/game/GameContext';
import { Button, Icon, Label } from '@/src/components/ui';
import { playTapSound } from '@/src/game/sounds';

export type ContactId = 'partho' | 'dad' | 'mom' | 'brother' | 'ayushee' | 'boss';

// Stylized Cartoon Vector Avatars
function Avatar({ id, size = 48 }: { id: ContactId; size?: number }) {
  const scale = size / 48;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {id === 'partho' && (
          // Partho: Cool rider pal with yellow cycling cap and shades
          <G>
            <Circle cx="24" cy="24" r="24" fill="#FFEAA7" />
            <Ellipse cx="24" cy="27" rx="14" ry="12" fill="#F8B195" />
            {/* Sunglasses */}
            <Rect x="14" y="24" width="8" height="6" rx="2" fill="#2D3436" />
            <Rect x="26" y="24" width="8" height="6" rx="2" fill="#2D3436" />
            <Rect x="22" y="26" width="4" height="2" fill="#2D3436" />
            {/* Friendly Smile */}
            <Path d="M21 34 Q24 37 27 34" fill="none" stroke="#2D3436" strokeWidth="2" strokeLinecap="round" />
            {/* Yellow Cycling Cap */}
            <Path d="M10 24 C10 14 38 14 38 24 Z" fill="#F39C12" />
            <Path d="M8 24 C8 24 16 19 32 23 C36 24 40 25 40 25" stroke="#E67E22" strokeWidth="3" strokeLinecap="round" />
          </G>
        )}

        {id === 'dad' && (
          // Dad: Thoughtful father with round glasses and mustache
          <G>
            <Circle cx="24" cy="24" r="24" fill="#DFF9FB" />
            <Ellipse cx="24" cy="28" rx="14" ry="12" fill="#F5CD79" />
            {/* Round Glasses */}
            <Circle cx="18" cy="24" r="5" fill="none" stroke="#303952" strokeWidth="2" />
            <Circle cx="30" cy="24" r="5" fill="none" stroke="#303952" strokeWidth="2" />
            <Path d="M23 24 H25" stroke="#303952" strokeWidth="2" />
            {/* Classic Mustache */}
            <Path d="M18 31 C20 29 23 32 24 32 C25 32 28 29 30 31" fill="#57606F" stroke="#303952" strokeWidth="2" strokeLinecap="round" />
            {/* Neat Grey Hair */}
            <Path d="M10 22 C10 12 38 12 38 22 C34 16 28 15 24 15 C20 15 14 16 10 22 Z" fill="#747D8C" />
          </G>
        )}

        {id === 'mom' && (
          // Mom: Warm gentle mother with pearl earrings and pleasant smile
          <G>
            <Circle cx="24" cy="24" r="24" fill="#FCE4EC" />
            <Ellipse cx="24" cy="28" rx="13" ry="12" fill="#F8B195" />
            {/* Eyes */}
            <Path d="M16 25 Q19 23 22 25" fill="none" stroke="#2D3436" strokeWidth="2" strokeLinecap="round" />
            <Path d="M26 25 Q29 23 32 25" fill="none" stroke="#2D3436" strokeWidth="2" strokeLinecap="round" />
            {/* Cheeks */}
            <Circle cx="15" cy="30" r="3" fill="#FF8A80" opacity="0.5" />
            <Circle cx="33" cy="30" r="3" fill="#FF8A80" opacity="0.5" />
            {/* Kind Smile */}
            <Path d="M20 33 Q24 37 28 33" fill="none" stroke="#C2185B" strokeWidth="2" strokeLinecap="round" />
            {/* Soft Wavy Hair */}
            <Path d="M10 28 C8 16 40 16 38 28 C42 12 6 12 10 28 Z" fill="#6D4C41" />
            {/* Pearl Earrings */}
            <Circle cx="9" cy="30" r="2.5" fill="#FFFFFF" stroke="#D7CCC8" strokeWidth="0.5" />
            <Circle cx="39" cy="30" r="2.5" fill="#FFFFFF" stroke="#D7CCC8" strokeWidth="0.5" />
          </G>
        )}

        {id === 'brother' && (
          // Brother: Younger brother with gaming headphones and hoodie
          <G>
            <Circle cx="24" cy="24" r="24" fill="#E8F5E9" />
            <Ellipse cx="24" cy="28" rx="13" ry="12" fill="#FFE0B2" />
            {/* Eyes */}
            <Circle cx="19" cy="26" r="2" fill="#2E7D32" />
            <Circle cx="29" cy="26" r="2" fill="#2E7D32" />
            {/* Playful Smirk */}
            <Path d="M22 34 Q26 36 28 32" fill="none" stroke="#2D3436" strokeWidth="2" strokeLinecap="round" />
            {/* Spiky Brown Hair */}
            <Path d="M11 22 L16 14 L22 17 L28 13 L33 18 L37 22 Z" fill="#5D4037" />
            {/* Gaming Headphones */}
            <Path d="M8 26 C6 14 42 14 40 26" fill="none" stroke="#388E3C" strokeWidth="3" />
            <Rect x="7" y="23" width="5" height="9" rx="2" fill="#1B5E20" />
            <Rect x="36" y="23" width="5" height="9" rx="2" fill="#1B5E20" />
          </G>
        )}

        {id === 'ayushee' && (
          // Ayushee: Friend with cute bob haircut and star hairpin
          <G>
            <Circle cx="24" cy="24" r="24" fill="#EDE7F6" />
            <Ellipse cx="24" cy="27" rx="13" ry="12" fill="#FFE0B2" />
            {/* Sparkly Eyes */}
            <Circle cx="19" cy="25" r="2.5" fill="#3F51B5" />
            <Circle cx="29" cy="25" r="2.5" fill="#3F51B5" />
            {/* Sweet Smile */}
            <Path d="M20 33 Q24 36 28 33" fill="none" stroke="#D81B60" strokeWidth="2" strokeLinecap="round" />
            {/* Bob Hair */}
            <Path d="M11 26 C10 14 38 14 37 26 C39 31 38 36 36 36 C34 32 35 22 13 22 C12 32 14 36 12 36 C10 36 9 31 11 26 Z" fill="#2C3E50" />
            {/* Yellow Star Hairpin */}
            <Path d="M13 19 L15 15 L17 19 L13 16 L17 16 Z" fill="#F1C40F" />
          </G>
        )}

        {id === 'boss' && (
          // Boss: Courier dispatcher with visor and headset mic
          <G>
            <Circle cx="24" cy="24" r="24" fill="#E0F2F1" />
            <Ellipse cx="24" cy="28" rx="13" ry="12" fill="#F5D6B8" />
            {/* Serious Focused Eyes */}
            <Path d="M16 23 L22 25" stroke="#004D40" strokeWidth="2" strokeLinecap="round" />
            <Path d="M32 23 L26 25" stroke="#004D40" strokeWidth="2" strokeLinecap="round" />
            <Circle cx="19" cy="26" r="1.5" fill="#004D40" />
            <Circle cx="29" cy="26" r="1.5" fill="#004D40" />
            {/* Professional Flat Mouth */}
            <Path d="M20 34 H28" stroke="#37474F" strokeWidth="2" strokeLinecap="round" />
            {/* Dispatcher Cap */}
            <Path d="M11 21 C11 12 37 12 37 21 Z" fill="#00695C" />
            <Path d="M9 21 H39" stroke="#004D40" strokeWidth="3" strokeLinecap="round" />
            {/* Headset Mic */}
            <Circle cx="10" cy="28" r="3" fill="#263238" />
            <Path d="M11 29 Q15 36 21 36" fill="none" stroke="#263238" strokeWidth="2" strokeLinecap="round" />
            <Circle cx="21" cy="36" r="2" fill="#FF5252" />
          </G>
        )}
      </Svg>
    </View>
  );
}

interface PhoneChatAppProps {
  onBackToApps: () => void;
  highlightPartho?: boolean;
}

export function PhoneChatApp({ onBackToApps, highlightPartho }: PhoneChatAppProps) {
  const { colors: c } = useTheme();
  const g = useGame();
  const p = g.profile;

  const [activeContact, setActiveContact] = useState<ContactId | null>(null);

  const pulse = useSharedValue(1);
  React.useEffect(() => {
    if (highlightPartho) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [highlightPartho]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const chatStage = p?.partho_chat_stage ?? 0;
  const isQuestActive = !p?.partho_quest_completed && chatStage < 2;

  // Handle Partho Dialogue Options
  const handleReplyYesBuddy = async () => {
    playTapSound();
    await g.setParthoChatStage(1);
  };

  const handleReplyTakeKeys = async () => {
    playTapSound();
    await g.borrowParthoExpress();
  };

  const contactsList = [
    {
      id: 'partho' as ContactId,
      name: 'Partho',
      relation: 'Fellow Courier · Rider Buddy',
      unread: isQuestActive,
      preview:
        chatStage === 0
          ? 'So you finally joined Chill Dash?'
          : chatStage === 1
          ? 'Great! Why dont u take my bike on the first day? I am nearby . Take my keys'
          : 'Enjoy The Express buddy! Catch you later.',
      time: 'Just now',
    },
    {
      id: 'ayushee' as ContactId,
      name: 'Ayushee',
      relation: 'Friend',
      unread: false,
      preview: 'Good luck on your first delivery! ✨ You got this.',
      time: '10:15 AM',
      staticMessage: 'Good luck on your first delivery! ✨ Wear your helmet and take care.',
    },
    {
      id: 'dad' as ContactId,
      name: 'Dad',
      relation: 'Family',
      unread: false,
      preview: 'Drive safe, son. Watch out for the rain.',
      time: 'Yesterday',
      staticMessage: 'Drive safe, son. Remember what I said about keeping air in your tires. Proud of you.',
    },
    {
      id: 'mom' as ContactId,
      name: 'Mom',
      relation: 'Family',
      unread: false,
      preview: 'Remember to eat lunch between deliveries ❤️',
      time: 'Yesterday',
      staticMessage: 'Remember to eat your apples and lunch between deliveries. Call me when you get back to the garage ❤️',
    },
    {
      id: 'brother' as ContactId,
      name: 'Brother',
      relation: 'Family',
      unread: false,
      preview: 'Can I play your console while you are out?',
      time: 'Friday',
      staticMessage: 'Hey bro, can I play on your gaming console while you are on your shift? I promise not to delete your save!',
    },
    {
      id: 'boss' as ContactId,
      name: 'Boss',
      relation: 'Chill Dash HQ Dispatcher',
      unread: false,
      preview: 'Welcome to the team. Stay safe out there.',
      time: 'Thursday',
      staticMessage: 'Welcome to the Chill Dash team. Pick up orders from footpath counters, deliver fast, and keep your customer ratings high.',
    },
  ];

  // 1. Conversation Screen (when a contact is selected)
  if (activeContact) {
    const contact = contactsList.find(c => c.id === activeContact)!;
    const isPartho = activeContact === 'partho';

    return (
      <View style={s.chatView}>
        {/* Chat Thread Header */}
        <View style={[s.chatHeader, { borderBottomColor: c.border }]}>
          <Pressable
            testID="chat-back-to-contacts"
            accessibilityRole="button"
            accessibilityLabel="Back to contacts list"
            onPress={() => setActiveContact(null)}
            style={({ pressed }) => [s.headerBackBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="arrow-back" size={20} color={c.onSurface} />
          </Pressable>

          <Avatar id={contact.id} size={38} />

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Label display style={s.chatHeaderName}>
              {contact.name}
            </Label>
            <Label style={s.chatHeaderSub}>
              {isPartho ? (chatStage >= 2 ? 'Nearby on the avenue' : 'Active nearby · Courier') : contact.relation}
            </Label>
          </View>
        </View>

        {/* Messages Stream */}
        <ScrollView style={s.messageScroll} contentContainerStyle={s.messageStream}>
          {isPartho ? (
            <>
              {/* Partho Initial Message */}
              <View style={s.receivedRow}>
                <Avatar id="partho" size={32} />
                <View style={[s.bubbleReceived, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                  <Label style={s.bubbleText}>So you finally joined Chill Dash?</Label>
                  <Label style={s.bubbleTime}>10:14 AM</Label>
                </View>
              </View>

              {/* User Reply 1 */}
              {chatStage >= 1 && (
                <View style={s.sentRow}>
                  <View style={[s.bubbleSent, { backgroundColor: c.brand, borderColor: c.borderStrong }]}>
                    <Label style={[s.bubbleText, s.bubbleTextSent]}>Yes buddy!</Label>
                    <Label style={s.bubbleTimeSent}>10:14 AM</Label>
                  </View>
                </View>
              )}

              {/* Partho Key Offer */}
              {chatStage >= 1 && (
                <View style={s.receivedRow}>
                  <Avatar id="partho" size={32} />
                  <View style={[s.bubbleReceived, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                    <Label style={s.bubbleText}>
                      Great! Why dont u take my bike on the first day? I am nearby . Take my keys
                    </Label>
                    <Label style={s.bubbleTime}>10:15 AM</Label>
                  </View>
                </View>
              )}

              {/* User Reply 2 */}
              {chatStage >= 2 && (
                <>
                  <View style={s.sentRow}>
                    <View style={[s.bubbleSent, { backgroundColor: c.brand, borderColor: c.borderStrong }]}>
                      <Label style={[s.bubbleText, s.bubbleTextSent]}>Yes sounds great.</Label>
                      <Label style={s.bubbleTimeSent}>10:15 AM</Label>
                    </View>
                  </View>
                  <View style={[s.systemNote, { backgroundColor: c.butter, borderColor: c.border }]}>
                    <Icon name="key-outline" size={16} color={c.teal} />
                    <Label style={s.systemNoteText}>
                      Keys handed over! The Express is equipped in your garage.
                    </Label>
                  </View>
                </>
              )}
            </>
          ) : (
            // Static Contact Message
            <View style={s.receivedRow}>
              <Avatar id={contact.id} size={32} />
              <View style={[s.bubbleReceived, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                <Label style={s.bubbleText}>{contact.staticMessage}</Label>
                <Label style={s.bubbleTime}>{contact.time}</Label>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Single-Reply Action Bar */}
        {isPartho && (
          <View style={[s.replyBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            {chatStage === 0 && (
              <Button
                testID="partho-reply-yes-buddy"
                title="Yes buddy!"
                icon="arrow-forward"
                onPress={handleReplyYesBuddy}
                style={{ flex: 1 }}
              />
            )}

            {chatStage === 1 && (
              <Button
                testID="partho-reply-take-keys"
                title="Yes sounds great."
                icon="key"
                onPress={handleReplyTakeKeys}
                style={{ flex: 1 }}
              />
            )}

            {chatStage >= 2 && (
              <View style={[s.readyPill, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                <Icon name="checkmark-circle" size={18} color="#48BB78" />
                <Label style={s.readyText}>The Express is ready. Go deliver your 1st order!</Label>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // 2. Contacts List View
  return (
    <View style={s.container}>
      <View style={s.inboxHeader}>
        <View>
          <Label style={s.inboxKicker}>MESSAGES</Label>
          <Label display style={s.inboxTitle}>Inbox</Label>
        </View>
        {isQuestActive && (
          <View style={[s.unreadBadge, { backgroundColor: c.coral }]}>
            <Label style={s.unreadBadgeText}>1 NEW</Label>
          </View>
        )}
      </View>

      <ScrollView style={s.contactsScroll} contentContainerStyle={{ paddingBottom: 24 }}>
        {contactsList.map(contact => {
          const isHighlighted = contact.id === 'partho' && isQuestActive;
          const isNonParthoLocked = isQuestActive && contact.id !== 'partho';

          return (
            <Pressable
              key={contact.id}
              testID={`chat-contact-${contact.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open chat with ${contact.name}`}
              disabled={isNonParthoLocked}
              onPress={() => {
                playTapSound();
                setActiveContact(contact.id);
              }}
              style={({ pressed }) => [
                s.contactRow,
                { backgroundColor: c.surface, borderColor: isHighlighted ? '#E53E3E' : c.border },
                isHighlighted && s.highlightedRow,
                isNonParthoLocked && { opacity: 0.4 },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={s.avatarWrap}>
                <Avatar id={contact.id} size={46} />
                {contact.unread && (
                  <Animated.View style={[s.unreadContactDot, isHighlighted && pulseStyle]} />
                )}
              </View>

              <View style={s.contactInfo}>
                <View style={s.contactTop}>
                  <Label display style={s.contactName}>
                    {contact.name}
                  </Label>
                  <Label style={s.contactTime}>{contact.time}</Label>
                </View>

                <Label style={s.contactRelation}>{contact.relation}</Label>

                <Label
                  numberOfLines={1}
                  style={[s.contactPreview, contact.unread && s.contactPreviewBold]}
                >
                  {contact.preview}
                </Label>
              </View>

              <Icon name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flex: 1,
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inboxKicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    opacity: 0.6,
  },
  inboxTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  contactsScroll: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  highlightedRow: {
    borderColor: '#E53E3E',
    borderWidth: 2,
    shadowColor: '#E53E3E',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  unreadContactDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E53E3E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  contactTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '800',
  },
  contactTime: {
    fontSize: 10,
    opacity: 0.6,
  },
  contactRelation: {
    fontSize: 10,
    opacity: 0.6,
    marginBottom: 2,
  },
  contactPreview: {
    fontSize: 12,
    opacity: 0.7,
  },
  contactPreviewBold: {
    fontWeight: '800',
    opacity: 1,
    color: '#D97706',
  },
  chatView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 460,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  chatHeaderName: {
    fontSize: 16,
  },
  chatHeaderSub: {
    fontSize: 10,
    opacity: 0.65,
  },
  messageScroll: {
    flex: 1,
  },
  messageStream: {
    padding: 14,
    gap: 12,
  },
  receivedRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '82%',
  },
  bubbleReceived: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  sentRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  bubbleSent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 1.5,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextSent: {
    fontWeight: '700',
  },
  bubbleTime: {
    fontSize: 9,
    opacity: 0.55,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeSent: {
    fontSize: 9,
    opacity: 0.75,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
    alignSelf: 'center',
  },
  systemNoteText: {
    fontSize: 11,
    fontWeight: '700',
  },
  replyBar: {
    padding: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  readyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
