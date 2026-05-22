import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:fridgeapp@notification.com',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Vercel 크론 보안 확인
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: '인증 실패' })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // 임박 기준: 3일 이내 만료 제품
    const alertDate = new Date(today)
    alertDate.setDate(alertDate.getDate() + 3)
    const alertStr = alertDate.toISOString().split('T')[0]

    // 모든 푸시 구독 조회
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subErr || !subs?.length) {
      return res.json({ success: true, sent: 0, message: '구독자 없음' })
    }

    // 가구별로 그룹화
    const byHousehold = {}
    for (const sub of subs) {
      if (!byHousehold[sub.household_id]) byHousehold[sub.household_id] = []
      byHousehold[sub.household_id].push(sub)
    }

    let sentCount = 0
    const expiredSubIds = []

    for (const [householdId, householdSubs] of Object.entries(byHousehold)) {
      // 해당 가구의 임박/만료 제품 조회
      const { data: products } = await supabase
        .from('products')
        .select('name, expiry_date')
        .eq('household_id', householdId)
        .gt('quantity', 0)
        .lte('expiry_date', alertStr)
        .order('expiry_date')

      if (!products?.length) continue

      const expired = products.filter(p => p.expiry_date < todayStr)
      const urgent = products.filter(p => p.expiry_date >= todayStr)

      let title = '🧊 냉장고 알림'
      let body = ''

      if (expired.length > 0 && urgent.length > 0) {
        body = `만료된 제품 ${expired.length}개, 임박 ${urgent.length}개를 확인해주세요`
      } else if (expired.length > 0) {
        const names = expired.slice(0, 2).map(p => p.name).join(', ')
        body = `${names}${expired.length > 2 ? ` 외 ${expired.length - 2}개`  : ''}이(가) 만료되었어요`
      } else {
        const names = urgent.slice(0, 2).map(p => p.name).join(', ')
        const dday = Math.ceil((new Date(urgent[0].expiry_date) - today) / 86400000)
        body = `${names}${urgent.length > 2 ? ` 외 ${urgent.length - 2}개` : ''}이(가) ${dday === 0 ? '오늘' : `${dday}일 후`} 만료돼요`
      }

      const payload = JSON.stringify({ title, body })

      for (const sub of householdSubs) {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          sentCount++
        } catch (e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            expiredSubIds.push(sub.id)
          }
        }
      }
    }

    // 만료된 구독 삭제
    if (expiredSubIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredSubIds)
    }

    return res.json({ success: true, sent: sentCount })
  } catch (e) {
    console.error('알림 발송 오류:', e)
    return res.status(500).json({ error: e.message })
  }
}
