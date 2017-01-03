import UIKit

struct Message {
    enum Kind: Int {
        case longerMoreThanAMinute
        case longerOneMinute
        case longerLessThanAMinute

        case shorterMoreThanAMinute
        case shorterOneMinute
        case shorterLessThanAMinute

        case longerTomorrowMoreThanAMinute
        case longerTomorrowOneMinute
        case longerTomorrowLessThanAMinute

        case shorterTomorrowMoreThanAMinute
        case shorterTomorrowOneMinute
        case shorterTomorrowLessThanAMinute

        init(sunPhase: SunPhase, yesterdayDaylightLength: Double, todayDaylightLength: Double, tomorrowDaylightLength: Double) {
            var kindRawValue = 0

            if sunPhase == .night {
                let tomorrowIsLonger = tomorrowDaylightLength - todayDaylightLength > 0
                if tomorrowIsLonger {
                    let longerTomorrowMoreThanAMinute = tomorrowDaylightLength - todayDaylightLength > 60

                    if longerTomorrowMoreThanAMinute > 1 {
                        Message.Kind.longerTomorrowMoreThanAMinute.rawValue
                    } else if longerTomorrowMoreThanAMinute > 0 {
                        Message.Kind.longerTomorrowOneMinute.rawValue
                    } else {
                        Message.Kind.longerTomorrowLessThanAMinute.rawValue
                    }
                } else {
                    let shorterTomorrowMoreThanAMinute = todayDaylightLength - tomorrowDaylightLength > 60

                    if shorterTomorrowMoreThanAMinute > 1 {
                        Message.Kind.shorterTomorrowMoreThanAMinute.rawValue
                    } else if shorterTomorrowMoreThanAMinute > 0 {
                        Message.Kind.shorterTomorrowOneMinute.rawValue
                    } else {
                        Message.Kind.shorterTomorrowLessThanAMinute.rawValue
                    }
                }
            } else {
                let todayIsLonger = todayDaylightLength - yesterdayDaylightLength > 0
                if todayIsLonger {
                    let longerMoreThanAMinute = todayDaylightLength - yesterdayDaylightLength > 60

                    if longerMoreThanAMinute > 1 {
                        Message.Kind.longerMoreThanAMinute.rawValue
                    } else if longerMoreThanAMinute > 0 {
                        Message.Kind.longerOneMinute.rawValue
                    } else {
                        Message.Kind.longerLessThanAMinute.rawValue
                    }
                } else {
                    let shorterMoreThanAMinute = yesterdayDaylightLength - todayDaylightLength > 60

                    if shorterMoreThanAMinute > 1 {
                        Message.Kind.shorterMoreThanAMinute.rawValue
                    } else if shorterMoreThanAMinute > 0 {
                        Message.Kind.shorterOneMinute.rawValue
                    } else {
                        Message.Kind.shorterLessThanAMinute.rawValue
                    }
                }
            }

            self.init(rawValue: kindRawValue)!
        }
    }

    init(format: String) {
        self.format = format
    }

    let format: String

    var content: String {
        return self.format.replacingOccurrences(of: "**", with: "")
    }

    var coloredPart: String {
        let regex = try! NSRegularExpression(pattern: "\\*\\*([^\"]*)\\*\\*")
        let nsString = self.format as NSString
        let results = regex.matches(in: self.format, range: NSRange(location: 0, length: nsString.length))
        if let firstResultRange = results.first?.range {
            let foundPart = nsString.substring(with: firstResultRange)

            return foundPart.replacingOccurrences(of: "**", with: "")
        } else {
            return ""
        }
    }

    func attributedString(withTextColor textColor: UIColor) -> NSAttributedString {
        let range = (self.content as NSString).range(of: self.coloredPart)
        let attributedString = NSMutableAttributedString(string: self.content)
        attributedString.addAttribute(NSForegroundColorAttributeName, value: textColor, range: range)

        return attributedString
    }
}
